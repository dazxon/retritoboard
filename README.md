# retritoboard

Tablero de retrospectivas multi-usuario en tiempo real, sin login. Pensado como reemplazo gratis y self-hosteable de MetroRetro/Ludi, corriendo enteramente en GitHub Pages + Firebase free tier.

[![Deploy](https://github.com/dazxon/retritoboard/actions/workflows/deploy.yml/badge.svg)](https://github.com/dazxon/retritoboard/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**🔗 Demo: https://dazxon.github.io/retritoboard/**

---

## Qué hace

Una persona crea una sala, comparte el link, y los demás entran poniendo su nombre. Cada participante agrega tarjetas en las columnas que el admin definió. El admin controla cuándo se revelan las tarjetas (modo escritura → modo discusión) y un cronómetro compartido marca los tiempos.

### Features

- ✍️ **Modo escritura** — cada participante solo ve sus propias tarjetas hasta que el admin pulse **Revelar**. El admin también ve placeholders 🔒 para mantenerse imparcial.
- 👁 **Toggle de reveal global** — bidireccional, podés volver a ocultar si querés rondas extra.
- ⏱️ **Cronómetro sincronizado** — el admin setea minutos:segundos, todos ven el countdown. Al llegar a 0 suena una alarma sintetizada (Web Audio API, sin assets).
- 🎨 **Columnas con color** — paleta de 6 colores asignable por columna. Defaults: verde / ámbar / violeta.
- ✏️ **Tarjetas editables in-place** — doble click para editar la propia, hover para borrar. Drag&drop entre columnas y para reordenar.
- 🖼️ **GIFs en tarjetas** — buscador integrado de [Giphy](https://giphy.com) (trending al abrir + search por texto). Selecciona y se embebe en la card.
- 👥 **Sidebar de participantes** con presencia online/away (heartbeat 30s) y click para filtrar sus tarjetas.
- 🔎 **Buscador y filtro por participante** — combinables. Busca en contenido + nombre del autor.
- 🌗 **Tema claro/oscuro/sistema** persistente.
- 📱 **Responsive** — board horizontal-scroll en mobile, sidebar abajo en pantallas chicas. Pensado para iPad.

## Stack

- [Vite](https://vite.dev) 8 + [React](https://react.dev) 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4 (modo class para dark)
- [Firebase](https://firebase.google.com) Firestore + Anonymous Auth (free Spark plan)
- [@dnd-kit](https://dndkit.com) para drag&drop
- [react-router-dom](https://reactrouter.com) con `HashRouter` (necesario para GH Pages sin server rewrites)
- Deploy automático con GitHub Actions a GitHub Pages

## Empezar local

```bash
git clone https://github.com/dazxon/retritoboard.git
cd retritoboard
npm install
npm run dev
```

Abre http://localhost:5173. Vas a ver que conecta a la instancia Firebase de la demo. Para usar tu propio Firebase (necesario si querés deployar la tuya), ver siguiente sección.

## Hostearlo en tu propio GitHub Pages

### 1. Forkear y configurar el repo

1. Forkeá [`dazxon/retritoboard`](https://github.com/dazxon/retritoboard) (debe ser **público** para GH Pages gratis).
2. En `vite.config.ts` cambiá el `base` al nombre de tu fork:
   ```ts
   export default defineConfig({
     base: '/TU-FORK/', // ej: '/retros/'
     // ...
   })
   ```

### 2. Crear proyecto Firebase

1. https://console.firebase.google.com → **Add project** → nombre lo que quieras → desactivar Analytics.
2. **Build → Authentication → Get started → Sign-in method → Anonymous** → Enable.
3. **Build → Firestore Database → Create database → Production mode** → región más cercana.
4. **⚙️ Project settings → General → Add app (web `</>`)** → registrar → copiar el objeto `firebaseConfig`.
5. Reemplazar las 6 keys en `src/lib/firebase.ts` con las tuyas.

### 3. Deploy de las security rules

Pegá el contenido de [`firestore.rules`](firestore.rules) en `https://console.firebase.google.com/project/TU-PROYECTO/firestore/rules` y publicá.

Estas reglas permiten:
- Cualquier usuario autenticado (anon) **lee** todo dentro de una sala
- Solo el **admin** (creador) modifica room/columns/timer/revealed
- Solo el **autor** o el admin modifica/borra una tarjeta
- Solo cada usuario escribe su propia entrada de presencia

### 4. (Opcional) Habilitar búsqueda de GIFs

El botón **🖼️ GIF** en cada columna usa la API de Giphy. Si no configurás la key, el botón directamente no aparece.

1. https://developers.giphy.com → **Create Account** → **Create an App** → tipo **API** → copiar la key.
2. **Local**: copiá `.env.example` a `.env.local` y pegá la key.
3. **Producción**: en GitHub, repo **Settings → Secrets and variables → Actions → New repository secret** → Name: `VITE_GIPHY_API_KEY`, Value: `<tu key>`.

El workflow ya inyecta la secret al build. Free tier: 1.000 búsquedas/día, suficiente para decenas de retros.

### 5. Activar GitHub Pages

En tu fork: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Cualquier push a `main` dispara el workflow `.github/workflows/deploy.yml` y deploya en `https://TU-USUARIO.github.io/TU-FORK/` en ~25 segundos.

## Modelo de datos (Firestore)

```
rooms/{roomId}
  name, createdBy, createdAt
  columns: [{id, title, order, color}]
  revealed: boolean
  timer: {state, endsAt, durationSec}

  /cards/{cardId}
    columnId, authorUid, authorName, content, order, createdAt

  /users/{uid}
    name, joinedAt, lastSeen
```

Notas:
- `order` con spacing de 1000, recálculo midpoint al arrastrar (evita renumerar toda la lista).
- `endsAt` es un timestamp absoluto del servidor; cada cliente computa `max(0, endsAt - now)` para el countdown.
- `lastSeen` se actualiza cada 30s; ventana de "online" 75s.
- `authorName` denormalizado: la tarjeta sobrevive sin necesidad de joinear con users/{uid}.

## Estructura del repo

```
src/
  lib/           Firebase init, types, hooks, dominio (cards/columns/rooms/timer/audio/theme/colors)
  components/    Board, ColumnView, CardView, Timer, Participants, FilterBar, ColorPicker, ThemeToggle
  routes/        Home (crear sala), Room (sala)
firestore.rules  Reglas de seguridad (fuente de verdad)
CLAUDE.md        Convenciones de trabajo y decisiones lockeadas
```

Más detalle en [CLAUDE.md](CLAUDE.md).

## Costos

Todo corre en plan gratis:

- **GitHub Pages**: gratis para repos públicos
- **Firebase Spark plan**: 50K reads/día, 20K writes/día, 1 GiB storage
- Una retro típica (10 personas, 30 min, 50 tarjetas) consume ~2K reads y ~500 writes — sobra para decenas de retros diarias en el free tier

## Limitaciones conocidas

- **El blur de tarjetas es visual, no criptográfico**: el contenido está en Firestore y un usuario técnico puede leerlo abriendo devtools. Si necesitás privacidad real, hace falta cifrado client-side (no implementado).
- **Sin Cloud Functions** (Spark plan): las salas no expiran automáticamente. Se acumulan en Firestore aunque sin costo (datos chicos). Limpieza manual o upgrade a Blaze para TTL.
- **HashRouter** (`/#/room/abc`) en vez de paths limpios — limitación de GH Pages sin server rewrites.
- **Sin autenticación real**: cualquiera con el link entra. Apropiado para retros de equipo, no para datos sensibles.

## Roadmap

Ideas para próximas iteraciones (sin compromiso):

- [ ] Voting / likes en tarjetas
- [ ] Agrupar tarjetas (clusters)
- [ ] Templates predefinidos (Mad/Sad/Glad, Start/Stop/Continue, 4 Ls)
- [ ] Export de la retro a Markdown
- [ ] Salas con password opcional
- [ ] Action items con asignados
- [ ] App Check / reCAPTCHA contra abuso
- [ ] Editar GIF de una tarjeta existente (ahora solo se puede agregar al crear)

## Contribuir

Issues y PRs bienvenidos. Para cambios grandes, abrí primero un issue para conversar el approach.

Convenciones internas en [CLAUDE.md](CLAUDE.md). Para correr local mirá la sección de [Empezar local](#empezar-local).

## Licencia

[MIT](LICENSE)
