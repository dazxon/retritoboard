import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../lib/useAuth'
import { db } from '../lib/firebase'
import { heartbeat, joinRoom, setRevealed, setRoomName } from '../lib/rooms'
import type { Room as RoomType, RoomUser } from '../lib/types'
import { Board } from '../components/Board'
import { Participants } from '../components/Participants'
import { Timer } from '../components/Timer'
import { primeAudio } from '../lib/audio'

const NAME_KEY = 'retritoboard:name'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user, loading: authLoading } = useAuth()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [roomMissing, setRoomMissing] = useState(false)
  const [joined, setJoined] = useState(false)
  const [myName, setMyName] = useState<string>('')
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY) ?? '',
  )
  const [joining, setJoining] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [editingRoomName, setEditingRoomName] = useState(false)
  const [roomNameDraft, setRoomNameDraft] = useState('')

  useEffect(() => {
    if (!editingRoomName) setRoomNameDraft(room?.name ?? '')
  }, [room?.name, editingRoomName])

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
      (snap) => {
        setJoined(snap.exists())
        if (snap.exists()) {
          const data = snap.data() as RoomUser
          setMyName(data.name)
        }
      },
    )
    return unsub
  }, [user, roomId])

  // Heartbeat de presencia cada 30s mientras estes joined
  useEffect(() => {
    if (!joined || !user || !roomId) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      heartbeat(roomId, user.uid).catch((e) =>
        console.error('heartbeat failed', e),
      )
    }
    const id = setInterval(tick, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [joined, user, roomId])

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!user || !roomId || !name.trim() || joining) return
    setJoining(true)
    primeAudio() // user gesture: desbloquear audio para la alarma del timer
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

  async function toggleReveal() {
    if (!roomId || !room) return
    try {
      await setRevealed(roomId, !room.revealed)
    } catch (e) {
      console.error('toggle revealed failed', e)
    }
  }

  async function saveRoomName() {
    if (!roomId) return
    const trimmed = roomNameDraft.trim()
    setEditingRoomName(false)
    if (!trimmed || trimmed === room?.name) {
      setRoomNameDraft(room?.name ?? '')
      return
    }
    try {
      await setRoomName(roomId, trimmed)
    } catch (e) {
      console.error('setRoomName failed', e)
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
            {editingRoomName && isAdmin ? (
              <input
                value={roomNameDraft}
                onChange={(e) => setRoomNameDraft(e.target.value)}
                onBlur={saveRoomName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRoomName()
                  if (e.key === 'Escape') {
                    setRoomNameDraft(room?.name ?? '')
                    setEditingRoomName(false)
                  }
                }}
                autoFocus
                maxLength={80}
                className="px-2 py-1 rounded text-2xl font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            ) : (
              <h1
                className={`text-2xl font-bold text-slate-900 dark:text-slate-100 ${
                  isAdmin ? 'cursor-text hover:text-violet-700 dark:hover:text-violet-300' : ''
                }`}
                onClick={() => isAdmin && setEditingRoomName(true)}
                title={isAdmin ? 'Click para renombrar' : ''}
              >
                {room?.name || 'Retro'}
              </h1>
            )}
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                admin
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {joined && room && (
            <Timer roomId={roomId!} timer={room.timer} isAdmin={isAdmin} />
          )}
          {isAdmin && joined && (
            <button
              type="button"
              onClick={toggleReveal}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                room?.revealed
                  ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-800 text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
              }`}
            >
              {room?.revealed ? '🙈 Ocultar' : '👁 Revelar'}
            </button>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {copyOk ? '✓ Copiado' : '🔗 Copiar link'}
          </button>
        </div>
      </header>

      {joined && room && !room.revealed && (
        <div className="max-w-[1500px] mx-auto mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <span>✍️</span>
          <span>
            <strong>Modo escritura.</strong> Cada uno solo ve sus tarjetas hasta
            que el admin presione <em>Revelar</em>.
          </span>
        </div>
      )}

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
        room &&
        user && (
          <main className="max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <Board
                roomId={roomId!}
                columns={room.columns}
                currentUid={user.uid}
                currentName={myName}
                isAdmin={isAdmin}
                revealed={room.revealed}
              />
            </div>
            <Participants
              roomId={roomId!}
              adminUid={room.createdBy}
              currentUid={user.uid}
            />
          </main>
        )
      )}
    </div>
  )
}
