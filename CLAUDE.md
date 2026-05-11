# retritoboard

App de retrospectivas tipo MetroRetro: salas multi-usuario en tiempo real, sin login, hosteada en GitHub Pages.

- **Live:** https://dazxon.github.io/retritoboard/
- **Repo:** `dazxon/retritoboard` (público)

## Stack

- **Front:** Vite 8 + React 19 + TS + Tailwind v4 (modo class para dark)
- **Realtime + auth:** Firebase Firestore + Anonymous Auth (plan Spark / free, región `southamerica-east1`)
- **DnD:** `@dnd-kit/core` + `sortable`
- **Routing:** `react-router-dom` con `HashRouter` — necesario porque GH Pages no soporta rewrites SPA
- **Hosting:** GitHub Pages vía Actions (`actions/deploy-pages@v4`), branch `main`

## Cómo trabajamos

**Directo a `main`. Cada push dispara deploy en ~25s.** Sin PRs, sin branches.

Loop estándar:

1. Editar
2. `npm run build` local para verificar que compila
3. `git add -A && git commit -m "..."` (sin co-author trailers)
4. `git push`
5. `gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status` para verificar deploy
6. Probar en la URL pública

`npm run dev` lo evitamos: preferimos build local + deploy + probar en producción.

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
firestore.rules     fuente de verdad de reglas — deploy es MANUAL en consola
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
- `users/{uid}`: lee cualquier auth; solo el propio uid escribe (presencia)

**Cambiar reglas requiere pegar manualmente en** https://console.firebase.google.com/project/retritoboard/firestore/rules

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

- Columnas: "Lo que estuvo bien" (emerald), "Lo que mejorar" (amber), "Action items" (violet)
- Timer: 10:00
- Alarma: 3 beeps Web Audio API (sin asset mp3)
- Paleta de colores: `slate, violet, emerald, amber, sky, rose`

## Comandos útiles

```
npm run build                # tsc + vite build
gh run list --limit 1        # último deploy
gh run watch <id>            # streamea el deploy
git log --oneline -10        # historial de fases
```

## Cuestiones humanas que no podemos automatizar

- Crear el proyecto Firebase + habilitar Auth/Firestore (ya hecho)
- Deploy de `firestore.rules` (paste manual en consola Firebase)
- Probar UX en el dispositivo objetivo (iPad) — Claude no lo ve
