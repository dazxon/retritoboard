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
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-card shadow-xl p-8 space-y-6 border border-slate-200 dark:border-slate-800">
          <header className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              retrito<span className="text-primary-600">board</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Retros simples, sin login. Compartí un link y listo.
            </p>
          </header>
          <div className="space-y-3">
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              placeholder="Nombre de la retro (opcional)"
              className={cx(FIELD, 'w-full px-4 py-3')}
            />
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateRoom}
              disabled={loading || creating || !user}
              className="w-full"
            >
              {loading ? 'Conectando…' : creating ? 'Creando…' : 'Crear sala'}
            </Button>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-card shadow-lg p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3 font-semibold">
              Salas recientes
            </h2>
            <ul className="space-y-1">
              {recent.map((r) => (
                <li
                  key={r.roomId}
                  className="group flex items-center gap-2 rounded-control hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/room/${r.roomId}`)}
                    className="flex-1 text-left px-3 py-2 flex items-center justify-between gap-2 min-w-0"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
                        {r.name}
                      </span>
                      {r.isAdmin && (
                        <span className="text-xs uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200 font-semibold flex-shrink-0">
                          admin
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {formatRelativeTime(r.lastVisitAt)}
                    </span>
                  </button>
                  <IconButton
                    label={`Olvidar ${r.name}`}
                    title="Olvidar de esta lista"
                    onClick={() => handleForget(r.roomId)}
                    className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus:opacity-100 px-2 py-1.5 mr-1 text-xs text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </IconButton>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              La lista vive solo en tu navegador
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
