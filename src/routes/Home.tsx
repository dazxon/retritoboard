import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { createRoom } from '../lib/rooms'
import { ThemeToggle } from '../components/ThemeToggle'

export default function Home() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200 dark:border-slate-800">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            retrito<span className="text-violet-600">board</span>
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
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={loading || creating || !user}
            className="w-full px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition"
          >
            {loading ? 'Conectando…' : creating ? 'Creando…' : 'Crear sala'}
          </button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
