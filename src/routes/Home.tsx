import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'

export default function Home() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')

  function handleCreateRoom() {
    const roomId = nanoid(8)
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
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
            placeholder="Nombre de la retro (opcional)"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition"
          >
            Crear sala
          </button>
        </div>
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          Fase 0 — la persistencia llega en la próxima iteración
        </p>
      </div>
    </div>
  )
}
