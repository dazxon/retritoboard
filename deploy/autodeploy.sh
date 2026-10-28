#!/usr/bin/env bash
# Autodeploy de retritoboard (SPA estática en GitHub Pages, sin GitHub Actions).
#
# Corre como agustin desde retritoboard-autodeploy.timer cada 10 min, sobre el checkout de deploy
# ~/apps/retritoboard (no se edita a mano: PR a main y el timer hace el resto).
#   1. Gate: HEAD vs origin/main + ~/apps/retritoboard.state. Sin cambios y ya publicado, sale.
#   2. merge --ff-only. Árbol sucio o HEAD divergido: status=pull_failed y exit 4, sin pisar nada.
#   3. npm ci + npm run build con VITE_GIPHY_API_KEY de ~/.config/retritoboard/build.env.
#      Sin key, o si el bundle no la trae, no publica (se perdería el botón de GIF).
#      Un build roto queda anotado (failed=<sha>) y no se reintenta hasta el próximo commit.
#   4. Si hay una retro en curso (retritoboard-retro-activa: sala con 2+ personas conectadas),
#      posterga sin tocar nada y el próximo timer reintenta.
#   5. npm run rules:deploy (idempotente: no-opea si firestore.rules no cambió).
#   6. Publica dist/ como un commit nuevo en la rama gh-pages (sin tocar el árbol de trabajo)
#      y espera hasta 5 min a que https://dazxon.github.io/retritoboard/ sirva el bundle nuevo.
#
#   retritoboard-autodeploy           # lo que hace el timer
#   retritoboard-autodeploy --force   # rearma aunque no haya cambios (respeta la retro en curso)
#   RB_IGNORE_RETRO=1 retritoboard-autodeploy --force   # publica aunque haya retro (avisar antes)
#
# Verificar: journalctl -u retritoboard-autodeploy | grep deployed   y   tail ~/apps/retritoboard-deploys.log
# Códigos: 0 ok, sin cambios o postergado · 1 build/rules/push roto · 4 ff falló.
#
# Canónico: dazxon/retritoboard deploy/autodeploy.sh (antes vivía en ~/server-setup, SDD-2026-067).
# La unit deploy/retritoboard-autodeploy.service lo ejecuta desde el checkout de deploy.
set -euo pipefail

REPO="${RB_REPO:-/home/agustin/apps/retritoboard}"
STATE="${RB_STATE:-/home/agustin/apps/retritoboard.state}"
LOG_FILE="${RB_DEPLOY_LOG:-/home/agustin/apps/retritoboard-deploys.log}"
CONF_DIR=/home/agustin/.config/retritoboard
PUBLIC_URL=https://dazxon.github.io/retritoboard/

exec 200>"$STATE.lock"
flock -n 200 || { echo "another instance running, skipping"; exit 0; }

force=0
[[ ${1:-} == --force ]] && force=1

log() { echo "[autodeploy] $*"; }
record() { echo "$(date -u +%FT%TZ) app=retritoboard $*" >> "$LOG_FILE"; log "$*"; }
state_get() { sed -n "s/^$1=//p" "$STATE" 2>/dev/null || true; }
state_set() { touch "$STATE"; grep -v "^$1=" "$STATE" > "$STATE.tmp" || true; echo "$1=$2" >> "$STATE.tmp"; mv "$STATE.tmp" "$STATE"; }
# Para los estados que se repiten en cada tick (postergado, sin credenciales): una línea por sha.
record_once() {
  local key=$1; shift
  if [[ $(state_get "$key") == "$SHA" ]]; then log "$*"; else state_set "$key" "$SHA"; record "$*"; fi
}

cd "$REPO"
if ! git fetch --quiet origin main; then
  record "status=fetch_failed"
  exit 0
fi
HEAD_SHA=$(git rev-parse HEAD)
NEW_SHA=$(git rev-parse origin/main)
if [[ $HEAD_SHA != "$NEW_SHA" ]]; then
  if [[ -n $(git status --porcelain --untracked-files=no) ]] || ! git merge --ff-only --quiet "$NEW_SHA"; then
    record "status=pull_failed head=$HEAD_SHA origin=$NEW_SHA"
    exit 4
  fi
  log "fast-forward $HEAD_SHA -> $NEW_SHA"
fi
SHA=$NEW_SHA
if (( ! force )) && [[ $(state_get deployed) == "$SHA" || $(state_get failed) == "$SHA" ]]; then
  exit 0
fi

# --- 3. build ---
if [[ -f $CONF_DIR/build.env ]]; then
  set -a; . "$CONF_DIR/build.env"; set +a
fi
if [[ -z ${VITE_GIPHY_API_KEY:-} ]]; then
  record_once blocked "status=blocked sha=$SHA motivo=sin_VITE_GIPHY_API_KEY ($CONF_DIR/build.env)"
  exit 1
fi
if ! (nice -n 10 npm ci --no-audit --no-fund --loglevel=error && nice -n 10 npm run build); then
  state_set failed "$SHA"
  record "status=build_failed sha=$SHA"
  exit 1
fi
if ! grep -qF "$VITE_GIPHY_API_KEY" dist/assets/*.js || [[ ! -f dist/.nojekyll ]]; then
  state_set failed "$SHA"
  record "status=build_failed sha=$SHA motivo=dist_sin_giphy_o_nojekyll"
  exit 1
fi

# --- 4. retro en curso ---
if [[ -z ${RB_IGNORE_RETRO:-} ]]; then
  rc=0
  salas=$(RB_REPO="$REPO" node "$REPO/deploy/retro-activa.mjs" 2>&1) || rc=$?
  case $rc in
    0) log "$salas" ;;
    3) record_once deferred "status=deferred sha=$SHA motivo=retro_en_curso salas=$salas"
       exit 0 ;;
    *) record_once blocked "status=blocked sha=$SHA motivo=no_pude_ver_retros ($salas)"
       exit 1 ;;
  esac
else
  record "status=retro_ignorada sha=$SHA (RB_IGNORE_RETRO)"
fi

# --- 5. reglas de Firestore (idempotente) ---
if ! npm run --silent rules:deploy; then
  record "status=rules_failed sha=$SHA"
  exit 1
fi

# --- 6. publicar dist/ en gh-pages ---
# Índice temporal: arma el árbol de dist/ sin tocar el índice ni el árbol de trabajo del checkout.
PARENT=""
if git fetch --quiet origin gh-pages 2>/dev/null; then PARENT=$(git rev-parse FETCH_HEAD); fi
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
export GIT_DIR="$REPO/.git" GIT_INDEX_FILE="$TMP_DIR/index"
TREE=$(git -C dist --work-tree="$REPO/dist" add -A -f . && git write-tree)
unset GIT_INDEX_FILE
if [[ -n $PARENT && $(git rev-parse "$PARENT^{tree}") == "$TREE" ]]; then
  log "gh-pages ya tiene este build"
else
  COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "deploy $(git log -1 --format='%h %s' "$SHA")")
  if ! git push --quiet origin "$COMMIT:refs/heads/gh-pages"; then
    record "status=push_failed sha=$SHA"
    exit 1
  fi
  log "gh-pages <- $COMMIT"
fi

# Pages tarda ~1 min en servir el commit nuevo. El index.html apunta al bundle con hash.
BUNDLE=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)
for _ in $(seq 30); do
  if curl -fsS --max-time 10 "$PUBLIC_URL?nocache=$(date +%s)" | grep -qF "$BUNDLE"; then
    state_set deployed "$SHA"
    record "status=deployed sha=$SHA bundle=$BUNDLE"
    log "deployed: $SHA"
    exit 0
  fi
  sleep 10
done
# Publicado en gh-pages pero Pages no lo sirve (¿Source no está en gh-pages?). No se reintenta el
# build: queda anotado para mirarlo a mano.
state_set deployed "$SHA"
record "status=published_not_live sha=$SHA bundle=$BUNDLE (revisar Settings > Pages)"
exit 0
