import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../lib/useAuth'
import { db } from '../lib/firebase'
import { heartbeat, joinRoom, setRevealed, setRoomName } from '../lib/rooms'
import { addColumn } from '../lib/columns'
import type { Card, Room as RoomType, RoomUser } from '../lib/types'
import { Board } from '../components/Board'
import { Participants } from '../components/Participants'
import { Timer } from '../components/Timer'
import { ThemeToggle } from '../components/ThemeToggle'
import { FilterBar } from '../components/FilterBar'
import { primeAudio } from '../lib/audio'
import { addRecentRoom } from '../lib/recentRooms'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { FIELD } from '../components/ui/field'
import { cx } from '../components/ui/cx'

type UserWithId = RoomUser & { id: string }
type CardWithId = Card & { id: string }

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
  const [participants, setParticipants] = useState<UserWithId[]>([])
  const [participantsError, setParticipantsError] = useState<string | null>(
    null,
  )
  const [search, setSearch] = useState('')
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set())
  const [cards, setCards] = useState<CardWithId[]>([])
  const [cardsError, setCardsError] = useState<string | null>(null)

  function toggleUid(uid: string) {
    setSelectedUids((prev) => {
      if (prev.has(uid)) return new Set()
      return new Set([uid])
    })
  }

  function clearFilters() {
    setSearch('')
    setSelectedUids(new Set())
  }

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

  // Suscripcion a los participantes (compartida entre sidebar y filtros)
  useEffect(() => {
    if (!roomId) return
    const unsub = onSnapshot(
      collection(db, 'rooms', roomId, 'users'),
      (snap) => {
        setParticipantsError(null)
        setParticipants(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as RoomUser) })),
        )
      },
      (err) => {
        console.error('participants subscribe error', err)
        setParticipantsError(err.message)
      },
    )
    return unsub
  }, [roomId])

  // Suscripcion a cards
  useEffect(() => {
    if (!roomId) return
    const q = query(collection(db, 'rooms', roomId, 'cards'), orderBy('order'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCardsError(null)
        setCards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Card) })))
      },
      (err) => {
        console.error('Cards subscribe error', err)
        setCardsError(err.message)
      },
    )
    return unsub
  }, [roomId])

  // Persiste sala en localStorage para mostrarla en Home como sala reciente
  useEffect(() => {
    if (!joined || !roomId || !room || !user) return
    addRecentRoom({
      roomId,
      name: room.name || 'Retro',
      lastVisitAt: Date.now(),
      isAdmin: user.uid === room.createdBy,
    })
  }, [joined, roomId, room, user])

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

  async function handleAddColumn() {
    if (!roomId || !room) return
    try {
      await addColumn(roomId, room.columns)
    } catch (e) {
      console.error('addColumn failed', e)
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
        <Link to="/" className="text-primary-600 hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    )
  }

  const isAdmin = !!user && user.uid === room?.createdBy

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <header className="max-w-[1500px] mx-auto mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/" className="text-sm text-primary-600 hover:underline">
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
                className={cx(FIELD, 'px-2 py-1 text-2xl font-bold')}
              />
            ) : (
              <h1
                className={`text-2xl font-bold text-slate-900 dark:text-slate-100 ${
                  isAdmin ? 'cursor-text hover:text-primary-700 dark:hover:text-primary-300' : ''
                }`}
                onClick={() => {
                  if (!isAdmin) return
                  setRoomNameDraft(room?.name ?? '')
                  setEditingRoomName(true)
                }}
                title={isAdmin ? 'Click para renombrar' : ''}
              >
                {room?.name || 'Retro'}
              </h1>
            )}
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
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
            <Button
              onClick={toggleReveal}
              variant="success"
              pressed={room?.revealed}
            >
              {room?.revealed ? '🙈 Ocultar' : '👁 Revelar'}
            </Button>
          )}
          <Button onClick={copyLink}>
            {copyOk ? '✓ Copiado' : '🔗 Copiar link'}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {joined && room && !room.revealed && (
        <Banner tone="amber" icon="✍️" className="max-w-[1500px] mx-auto mb-4">
          <strong>Modo escritura.</strong> Cada uno solo ve sus tarjetas hasta
          que el admin presione <em>Revelar</em>.
        </Banner>
      )}

      {joined && room && room.revealed && (
        <Banner tone="emerald" icon="👀" className="max-w-[1500px] mx-auto mb-4">
          <strong>Modo revisión.</strong> Todas las tarjetas están a la vista.
          Discutí, agrupá y priorizá.
        </Banner>
      )}

      {!joined ? (
        <div className="max-w-md mx-auto mt-8 bg-white dark:bg-slate-900 rounded-card shadow-xl p-8 border border-slate-200 dark:border-slate-800">
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
              className={cx(FIELD, 'w-full px-4 py-3')}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!name.trim() || joining}
              className="w-full"
            >
              {joining ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      ) : (
        room &&
        user && (
          <main className="max-w-[1500px] mx-auto">
            <FilterBar
              users={participants}
              search={search}
              onSearchChange={setSearch}
              selectedUids={selectedUids}
              onToggleUid={toggleUid}
              onClearAll={clearFilters}
              actions={
                isAdmin && (
                  <Button variant="dashed" onClick={handleAddColumn}>
                    + Columna
                  </Button>
                )
              }
            />
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <Board
                  roomId={roomId!}
                  columns={room.columns}
                  cards={cards}
                  cardsError={cardsError}
                  currentUid={user.uid}
                  currentName={myName}
                  isAdmin={isAdmin}
                  revealed={room.revealed}
                  search={search}
                  selectedUids={selectedUids}
                />
              </div>
              <Participants
                users={participants}
                error={participantsError}
                adminUid={room.createdBy}
                currentUid={user.uid}
                selectedUids={selectedUids}
                onToggleUid={toggleUid}
              />
            </div>
          </main>
        )
      )}
    </div>
  )
}
