# retritoboard

App de retrospectivas tipo MetroRetro: salas multi-usuario en tiempo real, sin login, hosteada en GitHub Pages.

- **Live:** https://dazxon.github.io/retritoboard/
- **Repo:** `dazxon/retritoboard` (público)

## Stack

- **Front:** Vite 8 + React 19 + TS + Tailwind v4 (modo class para dark)
- **Realtime + auth:** Firebase Firestore + Anonymous Auth (plan Spark / free, región `southamerica-east1`)
- **DnD:** `@dnd-kit/core` + `sortable`
- **Routing:** `react-router-dom` con `HashRouter` — necesario porque GH Pages no soporta rewrites SPA
- **Hosting:** GitHub Pages en "Deploy from a branch", rama `gh-pages` (root). Sin GitHub Actions: los publica un timer en hanna (ver "Deploy")

## Cómo trabajamos

**Rama + PR contra `main`.** Agustín revisa y mergea. Nada de GitHub Actions (están apagadas en todos sus repos; no crear `.github/workflows/`).

Loop estándar:

1. Rama nueva desde `main`, editar
2. `npm ci && npm run build` tiene que pasar (no hay tests automatizados: probar a mano el flujo tocado)
3. Commit sin atribución a Claude, push de la rama, PR contra `main`
4. Agustín mergea → el autodeploy de hanna lo publica (ver "Deploy")
5. Verificar en la URL pública que el bundle cambió: `curl -s https://dazxon.github.io/retritoboard/ | grep -o 'assets/index-[^"]*\.js'`

`npm run dev` sirve para probar local; producción es la URL pública.

## Deploy

Mergear a `main` no publica nada por sí solo. Lo hace `retritoboard-autodeploy.timer` en hanna (cada 10 min, canónico en `dazxon/server-setup`):

1. Detecta commits nuevos en `main` y hace `merge --ff-only` en `~/apps/retritoboard` (copia de deploy, no se edita a mano).
2. `npm ci && npm run build` con `VITE_GIPHY_API_KEY` de `~/.config/retritoboard/build.env`. Sin key, o si el bundle no la trae, no publica (se perdería el botón de GIF). Un build roto no se reintenta hasta el próximo commit.
3. Si hay una retro en curso (una sala con 2 o más personas conectadas en los últimos 5 min), posterga y reintenta en el próximo tick.
4. `npm run rules:deploy` (idempotente: sólo publica si `firestore.rules` difiere de las vivas).
5. Sube `dist/` como commit a la rama `gh-pages` y espera a que la URL pública sirva el bundle nuevo.

Estado: `tail ~/apps/retritoboard-deploys.log` (en hanna) o `journalctl -u retritoboard-autodeploy | grep deployed`. La rama `gh-pages` es generada: no se edita a mano.

## Estructura

```
src/
  lib/
    firebase.ts     init SDK (config web hardcodeada, es pública por diseño)
    useAuth.ts      hook signInAnonymously automático
    types.ts        Room, Column, Card, RoomUser, TimerState
    colors.ts       paleta de 6 con tokens (bg/dot/text/stripe/badge)
    rooms.ts        createRoom, joinRoom, heartbeat, setRevealed, setRoomName
    cards.ts        createCard, updateCardContent, moveCard, deleteCard
    columns.ts      add/rename/delete/setColumnColor (admin only por rules)
    timer.ts        start/pause/reset, endsAt absoluto en server timestamp
    audio.ts        AudioContext sintético (3 beeps), primeAudio() en user gesture
    theme.ts        useTheme: light/dark/system + listener prefers-color-scheme
    giphy.ts        search/trending de Giphy, GIPHY_ENABLED si hay VITE_GIPHY_API_KEY
    recentRooms.ts  CRUD localStorage para Home > salas recientes
  components/
    Board.tsx        DndContext + filtro de cards (search + selectedUids)
    ColumnView.tsx   accent bar, ColorPicker, header bold colored, dropzone
    CardView.tsx     sortable, stripe lateral en color de columna, edit inline
    Participants.tsx sidebar con presencia online/away + click-toggle filtro
    Timer.tsx        countdown a 0.5s, alarma una vez por run, suprime late joiner
    FilterBar.tsx    input búsqueda + chips, clear-all
    ColorPicker.tsx  popover con 6 swatches, click-outside
    ThemeToggle.tsx  cycle light → dark → system
    GiphyPicker.tsx  popover con search debounced + grid de previews
  routes/
    Home.tsx         crear sala
    Room.tsx         subscripciones (room, my-user, participants), banners, layout
firestore.rules     fuente de verdad de reglas — deploy con `npm run rules:deploy` (auto en cada push)
scripts/
  deploy-rules.mjs  publica firestore.rules via REST API (service account); idempotente
  feedback-list.mjs lee la colección /feedback via Admin SDK
```

## Modelo de datos

```
rooms/{roomId}
  name, createdBy, createdAt
  columns: [{id, title, order, color}]
  revealed: boolean
  timer: {state, endsAt, durationSec}

  /cards/{cardId}
    columnId, authorUid, authorName (denormalizado), content, order, createdAt
    reactions: {like|love|laugh|party|think|rocket: uid[]}

  /users/{uid}
    name, joinedAt, lastSeen
```

- `order` con spacing de 1000; midpoint recalculation on drag
- `endsAt` server timestamp absoluto; cliente computa `max(0, endsAt - now)`
- `lastSeen` actualizado por heartbeat cada 30s; ventana online = 75s
- `authorName` denormalizado para evitar join y sobrevivir desconexiones

## Permisos (firestore.rules)

- `rooms/{id}`: lee cualquier auth; solo `createdBy` modifica (columnas, revealed, timer, name)
- `cards/{id}`: lee cualquier auth; autor o admin modifica/borra
- `cards/{id}.reactions`: cualquier auth puede agregar/sacar solo su propio uid, con keys del set fijo (`src/lib/reactions.ts` y `firestore.rules` van en sync)
- `users/{uid}`: lee cualquier auth; solo el propio uid escribe (presencia)

**Deploy de reglas** (ya no se pega a mano en la consola):

- `npm run rules:deploy` publica `firestore.rules` vía la Firebase Rules REST API usando la service account de `~/.config/retritoboard/firebase-admin.json`. Es idempotente: compara con lo vivo y no-opea si no cambió. Flags: `--dry` (solo muestra si cambiaría), `--force` (re-publica igual).
- Además lo corre el autodeploy de hanna en cada release (ver "Deploy"), con la SA en `~/.config/retritoboard/firebase-admin.json` de hanna. Nunca desde la nube.
- Editás `firestore.rules` en el repo → PR mergeado → se deploya. El repo es la fuente de verdad exacta.

## Decisiones lockeadas (no romper sin avisar)

| Tema | Decisión |
|---|---|
| Router | `HashRouter` (GH Pages no soporta rewrites) |
| Base path | `/retritoboard/` en `vite.config.ts` |
| Admin | El creador es admin permanente, no se transfiere |
| Password de sala | No. El link único es la única barrera |
| Blur de cards | Es UX visual, NO seguridad real (las cards ocultas no están en el DOM pero sí en Firestore) |
| Admin pre-reveal | El admin TAMBIÉN ve cards ajenas como placeholders hasta apretar Revelar |
| Filtro participante | Single-select (click toggle, segundo click deselecciona) |
| Search | Matchea content + author; en cards ocultas solo autor |
| Theme | Default `system`, override manual con persistencia en localStorage |
| Idiomas | Español argentino en todos los copys |
| Templates de columnas | No en MVP, solo defaults editables |
| Code splitting | No urgente (200 KB gzip está OK) |
| App Check | No instalado; agregar si aparece abuse real |

## Defaults

- Columnas: "Lo que estuvo bien" (emerald), "Lo que mejorar" (amber), "Accionables" (violet)
- Timer: 10:00
- Alarma: 3 beeps Web Audio API (sin asset mp3)
- Reacciones: 👍 ❤️ 😂 🎉 🤔 🚀 (sin negativos), visibles recién con la sala revelada
- Paleta de colores: `slate, violet, emerald, amber, sky, rose`

## Comandos útiles

```
npm run build                # tsc + vite build
npm run rules:deploy         # deploya firestore.rules (idempotente); -- --dry / -- --force
curl -s https://dazxon.github.io/retritoboard/ | grep -o 'assets/index-[^"]*\.js'   # bundle en vivo
git log --oneline -10        # historial de fases
```

## Cuestiones humanas que no podemos automatizar

- Crear el proyecto Firebase + habilitar Auth/Firestore (ya hecho)
- Probar UX en el dispositivo objetivo (iPad) — Claude no lo ve
