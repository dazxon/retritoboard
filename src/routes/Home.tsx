import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { createRoom } from '../lib/rooms'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  formatRelativeTime,
  getRecentRooms,
  removeRecentRoom,
  type RecentRoom,
} from '../lib/recentRooms'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { FIELD } from '../components/ui/field'
import { cx } from '../components/ui/cx'
import { PANEL } from '../components/ui/surface'
import { Logo } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'
import { AdminBadge } from '../components/ui/AdminBadge'
import { Sparkles, X } from 'lucide-react'

// Cómo funciona, en tres pasos (el flujo de una retro de ~10 minutos)
const STEPS: [string, string][] = [
  ['🔗', 'Creá la sala y compartí el link con el equipo.'],
  ['✍️', 'Cada uno escribe sus tarjetas en privado.'],
  ['🎯', 'Revelan, votan y salen con los accionables.'],
]

export default function Home() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentRoom[]>(getRecentRooms)

  async function handleCreateRoom() {
    if (!user || creating) return
    setCreating(true)
    setError(null)
    try {
      const roomId = await createRoom({ name: roomName, createdBy: user.uid })
      navigate(`/room/${roomId}`)
    } catch (e) {
      console.error(e)
      setError('No pude crear la sala. Probá de nuevo.')
      setCreating(false)
    }
  }

  function handleForget(roomId: string) {
    removeRecentRoom(roomId)
    setRecent(getRecentRooms())
  }

  return (
    <div className="relative min-h-full flex flex-col items-center justify-center px-page py-16 overflow-hidden">
      {/* Fondo: halo de marca arriba y grilla de puntos muy suave */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] opacity-70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-56 left-1/2 -translate-x-1/2 -z-10 h-[34rem] w-[60rem] max-w-[200vw] [background:radial-gradient(closest-side,var(--color-primary-400),transparent)] opacity-25 dark:opacity-20"
        aria-hidden
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full flex flex-col gap-5">
        <header className="text-center flex flex-col items-center gap-3 mb-2">
          <Logo size="lg" />
          <p className="text-body text-ink-muted max-w-xs">
            Retros simples y en tiempo real, sin login. Compartí un link y listo.
          </p>
        </header>

        <div className={cx(PANEL, 'shadow-raised p-6 sm:p-7')}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateRoom()
            }}
          >
            <label htmlFor="room-name" className="text-sm font-medium text-ink">
              Nueva retro
            </label>
            <input
              id="room-name"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Nombre de la retro (opcional)"
              maxLength={80}
              className={cx(FIELD, 'w-full h-11 px-3.5 text-body')}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || creating || !user}
              className="w-full"
            >
              {loading || creating ? <Spinner /> : <Sparkles />}
              {loading ? 'Conectando…' : creating ? 'Creando…' : 'Crear sala'}
            </Button>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            )}
          </form>

          <ol className="mt-6 pt-5 border-t border-line grid gap-3 text-sm text-ink-muted">
            {STEPS.map(([emoji, text], i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  className="size-8 flex-shrink-0 rounded-full bg-surface-muted inline-flex items-center justify-center text-base"
                  aria-hidden
                >
                  {emoji}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {recent.length > 0 && (
          <section className={cx(PANEL, 'p-2')}>
            <h2 className="eyebrow px-3 pt-2 pb-1.5">Salas recientes</h2>
            <ul>
              {recent.map((r) => (
                <li
                  key={r.roomId}
                  className="group flex items-center gap-1 rounded-control hover:bg-surface-muted transition"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/room/${r.roomId}`)}
                    className="flex-1 text-left px-3 py-2.5 flex items-center justify-between gap-3 min-w-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-ink font-medium">
                        {r.name}
                      </span>
                      {r.isAdmin && <AdminBadge />}
                    </span>
                    <span className="text-meta text-ink-subtle flex-shrink-0">
                      {formatRelativeTime(r.lastVisitAt)}
                    </span>
                  </button>
                  <IconButton
                    label={`Olvidar ${r.name}`}
                    title="Olvidar de esta lista"
                    variant="danger"
                    onClick={() => handleForget(r.roomId)}
                    className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus:opacity-100 mr-1"
                  >
                    <X />
                  </IconButton>
                </li>
              ))}
            </ul>
            <p className="px-3 pt-1 pb-2 text-meta text-ink-subtle">
              La lista vive solo en tu navegador.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
