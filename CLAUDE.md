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

**Rama + PR contra `main`.** Claude mergea cuando está probado (ver «Entrega» al final). Nada de GitHub Actions (están apagadas en todos sus repos; no crear `.github/workflows/`).

Loop estándar:

1. Rama nueva desde `main`, editar
2. `npm ci && npm run check` tiene que pasar (lint + tests + build). Si tocaste `firestore.rules` o un flujo de la sala, también `npm run check:full` (ver "Tests")
3. Commit sin atribución a Claude, push de la rama, PR contra `main`
4. Claude mergea cuando está probado (Agustín no prueba ni mergea) → el autodeploy de hanna lo publica (ver "Deploy")
5. Verificar en la URL pública que el bundle cambió: `curl -s https://dazxon.github.io/retritoboard/ | grep -o 'assets/index-[^"]*\.js'`

`npm run dev` sirve para probar local; producción es la URL pública.

## Deploy

Mergear a `main` no publica nada por sí solo. Lo hace `retritoboard-autodeploy.timer` en hanna (cada 10 min; script, chequeo de retro activa y units en [`deploy/`](deploy/README.md)):

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
    colors.ts       paleta de 6 con tokens (bg/border/dot/text/stripe/badge) y avatarColor
    rooms.ts        createRoom, joinRoom, heartbeat, setRevealed, setRoomName
    cards.ts        createCard, updateCard, moveCard, deleteCard (soft), restoreCard
    columns.ts      add/rename/delete/setColumnColor (admin only por rules)
    timer.ts        start/pause/reset, endsAt absoluto en server timestamp
    audio.ts        AudioContext sintético (3 beeps), primeAudio() en user gesture
    theme.ts        useTheme: light/dark/system + listener prefers-color-scheme
    giphy.ts        search/trending de Giphy, GIPHY_ENABLED si hay VITE_GIPHY_API_KEY
    recentRooms.ts  CRUD localStorage para Home > salas recientes
    order.ts        nextOrder y dropOrder (punto medio al soltar)
    filterCards.ts  agrupar tarjetas por columna con búsqueda, filtro y propias primero
    presentation.ts ronda de presentación: presentadores en orden fijo, siguiente/anterior/saltar/marcar
    reactions.ts    reacciones estilo Slack: agrupar por emoji, toggle, frases de quién reaccionó, rápidos recientes
    useAnchoredPosition.ts  posición fixed de un popover contra su botón (GIF, emojis)
    *.test.ts       tests de la lógica pura (Vitest)
    useAutosizeTextarea.ts  alto del textarea según contenido, scroll pasado el tope
    useDismiss.ts   cerrar popovers con tap/click afuera (pointerdown) o Escape
  components/
    Board.tsx        DndContext + filtro de cards (search + selectedUids)
    ColumnView.tsx   accent bar, ColorPicker, header bold colored, dropzone
    CardView.tsx     sortable, stripe lateral en color de columna, edit inline
    Participants.tsx sidebar con presencia online/away + click-toggle filtro
    Timer.tsx        countdown a 0.5s, alarma una vez por run, suprime late joiner
    FilterBar.tsx    input búsqueda + chips, clear-all
    PresentationBar.tsx ronda de presentación: quién presenta, quiénes pasaron y quiénes faltan
    ColorPicker.tsx  popover con 6 swatches, click-outside
    ThemeToggle.tsx  cycle light → dark → system
    GiphyPicker.tsx  popover con search debounced + grid de previews
    ReactionBar.tsx  chips de reacciones (emoji + contador, tocar suma o saca) y botón "+"
    EmojiPicker.tsx  picker completo (frimousse, datos emojibase en español), lazy-load desde ReactionBar
    ui/              primitivas: Button, IconButton, Banner, Avatar, AdminBadge, Spinner, Logo, FIELD (inputs), PANEL/POPOVER, cx
  routes/
    Home.tsx         crear sala
    Room.tsx         subscripciones (room, my-user, participants), banners, layout
firestore.rules     fuente de verdad de reglas — deploy con `npm run rules:deploy` (auto en cada push)
tests/
  rules/            firestore.rules contra el emulador (@firebase/rules-unit-testing)
  e2e/              smoke con Playwright: retro completa con dos personas en el emulador
deploy/             autodeploy en hanna (script, chequeo de retro activa, units) — ver deploy/README.md
scripts/
  deploy-rules.mjs  publica firestore.rules via REST API (service account); idempotente
  feedback-list.mjs lee la colección /feedback via Admin SDK
```

## UI: tokens y componentes base

Todos los tokens viven en `src/index.css` (`:root`/`.dark` + `@theme inline`); el comentario de arriba del archivo es la referencia.

- Color de marca: `primary-*` (hoy apunta a violeta). No usar `violet-*` directo en componentes; la paleta de columnas y de avatares sigue en `lib/colors.ts`.
- Superficies y texto con tokens semánticos que ya cambian en oscuro (sin `dark:`): `bg-canvas` (página), `bg-surface` (paneles, tarjetas), `bg-surface-muted` (hover, campos secundarios), `border-line` / `border-line-strong`, `text-ink` / `text-ink-muted` / `text-ink-subtle`. No usar `slate-*` ni `bg-white` en componentes.
- Tipografía: Inter (`font-sans`, todo) y Plus Jakarta Sans (`font-display`: logo, títulos de sala y columnas, diálogos), self-hosted con `@fontsource-variable`. Escala: `text-display`, `text-title`, `text-heading`, `text-body` (contenido de tarjetas, 15px), `text-sm` (controles) y `text-meta` (12px, el mínimo; nada de `text-[10px]` salvo la inicial del `Avatar`). Rótulos en mayúscula con la utilidad `eyebrow`.
- Espaciado: `p-page`/`px-page` (margen de página, 16→24px), `p-panel` (columnas, paneles), `p-card` (tarjetas). El resto con la escala de Tailwind.
- Radios: `rounded-card` (tarjetas, columnas, paneles) y `rounded-control` (botones, inputs). Sombras: `shadow-card`, `shadow-raised` (hover/arrastre), `shadow-pop` (popovers, modales).
- Íconos de controles con `lucide-react`; los emojis quedan para contenido (reacciones, banners, pasos de Home).
- Botones con `ui/Button` (`primary`, `secondary`, `soft`, `ghost`, `dashed`; tamaños `xs`–`lg` con alto fijo, más alto en touch; `pressed` para toggles; el ícono va como hijo y toma el tamaño del botón). Botones solo-ícono con `ui/IconButton` (`label` obligatorio; `ghost`, `secondary`, `danger`; `xs`–`md`).
- Inputs y textareas con `FIELD` (o `FIELD_BASE` + fondo/texto propios). No pasar por `className` una clase que pise otra del mismo tipo (`bg-*`, `text-*`): no hay tailwind-merge.
- Superficies armadas en `ui/surface.ts`: `PANEL` (paneles en página) y `POPOVER` (todo lo que flota, con animación de entrada). Otras primitivas: `Banner` (con `aside`), `Avatar` (color estable por nombre, punto de presencia), `AdminBadge`, `Spinner`, `Logo`/`LogoMark` (mismo dibujo que `public/favicon.svg`).
- Acciones que se muestran al hover: ocultarlas solo con `pointer-fine:` para que en iPad se vean.

## Modelo de datos

```
rooms/{roomId}
  name, createdBy, createdAt
  columns: [{id, title, order, color}]
  revealed: boolean
  timer: {state, endsAt, durationSec}
  presentation?: {order: uid[], current: uid|null, done: uid[]}

  /cards/{cardId}
    columnId, authorUid, authorName (denormalizado), content, order, createdAt
    reactionsBy: {[uid]: {[emoji]: millis}}   reacciones estilo Slack
    reactions?: {like|love|...: uid[]}        formato viejo (set fijo): solo se lee y se limpia

  /users/{uid}
    name, joinedAt, lastSeen
```

- `order` con spacing de 1000; midpoint recalculation on drag
- `endsAt` server timestamp absoluto; cliente computa `max(0, endsAt - now)`
- `lastSeen` actualizado por heartbeat cada 30s; ventana online = 75s
- `authorName` denormalizado para evitar join y sobrevivir desconexiones
- `presentation` (modo presentación, solo con la sala revelada): orden sorteado al arrancar y fijo (los que escriben después se suman al final), así no se reacomoda cuando la gente entra o sale. Presentan quienes tienen tarjetas fuera de Accionables. Mientras dura, el filtro por persona es el mismo para todos, Accionables no se filtra y la barra reemplaza al panel de participantes

## Permisos (firestore.rules)

- `rooms/{id}`: lee cualquier auth; solo `createdBy` modifica (columnas, revealed, timer, name)
- `cards/{id}`: lee cualquier auth; autor o admin modifica/borra
- `cards/{id}.reactionsBy`: cualquier auth toca solo `reactionsBy.{su uid}` (hasta 50 emojis por tarjeta). Las rules no pueden validar que la key sea un emoji: la app ignora las que no lo son (`isEmoji`)
- `cards/{id}.reactions` (viejo): cualquier auth agrega/saca solo su propio uid, con keys del set fijo (`LEGACY_REACTIONS` en `src/lib/reactions.ts` y `firestore.rules` van en sync)
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
- Reacciones: cualquier emoji, estilo Slack (varios por persona, tocar el chip te suma o te saca), visibles recién con la sala revelada. Rápidos del picker: los últimos que usaste, completados con 👍 ❤️ 😂 🎉 🤔 🚀 👀 🙌. Los datos del picker (`emojibase-data/es`) se publican con el sitio en `emojibase/es/` (plugin en `vite.config.ts`)
- Paleta de colores: `slate, violet, emerald, amber, sky, rose`

## Tests

Sin GitHub Actions: se corren a mano antes de mergear.

- `npm test`: Vitest sobre la lógica pura de `src/lib` (orden, filtros, votos, salas recientes). Instantáneo, sin dependencias.
- `npm run test:rules`: cada permiso de `firestore.rules` contra el emulador de Firestore. Necesita Java 11+. Cambiar una regla sin su caso acá es romper el único control de seguridad que hay.
- `npm run test:e2e`: build en modo `emulator` (la app apunta a los emuladores, ver `src/lib/firebase.ts`) y una retro completa con dos navegadores: crear, escribir oculto, revelar, votar, arrastrar. La primera vez: `npx playwright install chromium`.
- `npm run check` = lint + test + build; `npm run check:full` suma reglas y e2e.

Lógica nueva con reglas de negocio va a `src/lib` como función pura con su `.test.ts`, no dentro del componente.

## Comandos útiles

```
npm run build                # tsc + vite build
npm run check                # lint + tests + build (check:full suma reglas y e2e)
npm run rules:deploy         # deploya firestore.rules (idempotente); -- --dry / -- --force
curl -s https://dazxon.github.io/retritoboard/ | grep -o 'assets/index-[^"]*\.js'   # bundle en vivo
git log --oneline -10        # historial de fases
```

## Cuestiones humanas que no podemos automatizar

- Crear el proyecto Firebase + habilitar Auth/Firestore (ya hecho)
- Probar UX en el dispositivo objetivo (iPad) — Claude no lo ve

## Entrega: quién mergea (también desde la nube)

Esta sección vale igual en hannaserver y en una sesión en la nube, y pisa el default del entorno
cloud de "no abrir ni mergear PRs sin pedido explícito".

- **Claude mergea.** Si el cambio cumple lo pedido y la validación local de este repo da verde,
  abrís el PR y lo mergeás (squash) sin preguntar. Un PR abierto no es una entrega.
- **Se pide OK antes sólo para:** lo destructivo o irreversible (borrar datos, migraciones que tiran
  columnas o tablas), lo que corta a gente que está usando algo, exponer algo nuevo a internet,
  cambios de contrato entre repos, o cuando Agustin dijo "esperá" / "no mergees".
- **Desde la nube** no hay `gh`, `wt`, `ssh hanna` ni `deploy.sh`: se trabaja en la rama que
  asignó la sesión, y el PR se abre y se mergea con las herramientas de GitHub. Lo que no se pudo
  hacer o verificar (deploy, QA contra datos reales, el aparato físico) se dice en el PR y en la
  respuesta; no es motivo para dejar el PR sin mergear.
- **Después del merge:** lo que diga la sección de deploy de este archivo (o del README). Desde la nube no se verifica el SHA deployado: se avisa "mergeado, el deploy lo toma el server" y listo.
- **Sin atribución a Claude ni a IA** en commits ni PRs (`Co-Authored-By`, `Claude-Session`,
  "Generated with"), aunque el entorno la agregue sola. Al mergear con squash, mensaje explícito
  sin trailers.
