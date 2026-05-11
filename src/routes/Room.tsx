import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../lib/useAuth'
import { db } from '../lib/firebase'
import { joinRoom } from '../lib/rooms'
import type { Room as RoomType } from '../lib/types'

const NAME_KEY = 'retritoboard:name'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user, loading: authLoading } = useAuth()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [roomMissing, setRoomMissing] = useState(false)
  const [joined, setJoined] = useState(false)
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY) ?? '',
  )
  const [joining, setJoining] = useState(false)
  const [copyOk, setCopyOk] = useState(false)

  useEffect(() => {
    if (!roomId) return
    const unsub = onSnapshot(
      doc(db, 'rooms', roomId),
      (snap) => {
        if (snap.exists()) {
          setRoom(snap.data() as RoomType)
          setRoomMissing(false)
        } else {
          setRoomMissing(true)
        }
        setRoomLoading(false)
      },
      (err) => {
        console.error('Room subscribe error', err)
        setRoomLoading(false)
      },
    )
    return unsub
  }, [roomId])

  useEffect(() => {
    if (!user || !roomId) return
    const unsub = onSnapshot(
      doc(db, 'rooms', roomId, 'users', user.uid),
      (snap) => setJoined(snap.exists()),
    )
    return unsub
  }, [user, roomId])

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!user || !roomId || !name.trim() || joining) return
    setJoining(true)
    try {
      localStorage.setItem(NAME_KEY, name.trim())
      await joinRoom({ roomId, uid: user.uid, name: name.trim() })
    } catch (err) {
      console.error('join failed', err)
      setJoining(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyOk(true)
      setTimeout(() => setCopyOk(false), 1500)
    } catch {
      // ignore
    }
  }

  if (authLoading || roomLoading) {
    return (
      <div className="min-h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
        Cargando…
      </div>
    )
  }

  if (roomMissing) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-700 dark:text-slate-300">
          Esta sala no existe o expiró.
        </p>
        <Link to="/" className="text-violet-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    )
  }

  const isAdmin = !!user && user.uid === room?.createdBy

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/" className="text-sm text-violet-600 hover:underline">
            ← retritoboard
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {room?.name || 'Retro'}
            </h1>
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                admin
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          {copyOk ? '✓ Copiado' : '🔗 Copiar link'}
        </button>
      </header>

      {!joined ? (
        <div className="max-w-md mx-auto mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
            ¿Cómo te llamás?
          </h2>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              autoFocus
              maxLength={40}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!name.trim() || joining}
              className="w-full px-4 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition"
            >
              {joining ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      ) : (
        <main className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
            <p className="text-slate-700 dark:text-slate-200 text-center mb-4">
              Estás dentro. Las columnas y tarjetas vienen en la Fase 2.
            </p>
            <div className="mt-6 max-w-sm mx-auto">
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                Columnas configuradas
              </p>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {room?.columns
                  ?.slice()
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <li key={c.id} className="px-3 py-2 rounded bg-slate-50 dark:bg-slate-800">
                      {c.title}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
