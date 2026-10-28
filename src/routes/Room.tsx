import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../lib/useAuth'
import { db } from '../lib/firebase'
import { heartbeat, joinRoom, setRevealed, setRoomName } from '../lib/rooms'
import { addColumn } from '../lib/columns'
import type { Card, PresentationState, Room as RoomType, RoomUser } from '../lib/types'
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
import { PANEL } from '../components/ui/surface'
import { LogoMark } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'
import { Avatar } from '../components/ui/Avatar'
import { AdminBadge } from '../components/ui/AdminBadge'
import { ArrowLeft, Check, Eye, EyeOff, Link2, Plus, Presentation } from 'lucide-react'
import { getActionablesColumn } from '../lib/columns'
import {
  castVote,
  clearVoting,
  closeVoting,
  openVoting,
  sumVotes,
  tallyVotes,
  votesOf,
  type BoardVoting,
} from '../lib/voting'
import { VotingBanner, VotingButton } from '../components/Voting'
import {
  endPresentation,
  goNext,
  goPrev,
  goTo,
  presentersOf,
  setPresentation,
  startState,
  toggleDone,
} from '../lib/presentation'
import { PresentationBar } from '../components/PresentationBar'

type UserWithId = RoomUser & { id: string }
type CardWithId = Card & { id: string }

const NAME_KEY = 'retritoboard:name'
const NO_UIDS = new Set<string>()

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user, loading: authLoading } = useAuth()
  // Las suscripciones esperan al login anonimo: en un navegador nuevo (todo el
  // que entra por primera vez con el link) arrancaban sin auth, las reglas las
  // rechazaban y la sala quedaba vacia para siempre
  const uid = user?.uid
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

  // Modo presentación (solo con la sala revelada): el filtro por persona lo
  // maneja el admin y es el mismo para todos
  const presentation =
    room?.revealed && room.presentation ? room.presentation : null
  const presentingUid = presentation?.current
  const boardSelectedUids = useMemo(
    () =>
      presentingUid === undefined
        ? selectedUids
        : new Set(presentingUid ? [presentingUid] : []),
    [presentingUid, selectedUids],
  )

  useEffect(() => {
    if (!roomId || !uid) return
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
  }, [roomId, uid])

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
    if (!roomId || !uid) return
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
  }, [roomId, uid])

  // Suscripcion a cards
  useEffect(() => {
    if (!roomId || !uid) return
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
  }, [roomId, uid])

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
      <div className="min-h-full flex items-center justify-center gap-2.5 text-sm text-ink-muted">
        <Spinner className="text-primary-500" />
        Cargando la sala…
      </div>
    )
  }

  if (roomMissing) {
    return (
      <div className="min-h-full flex items-center justify-center p-page">
        <div className={cx(PANEL, 'max-w-sm w-full p-8 text-center flex flex-col items-center gap-3')}>
          <span className="text-4xl" aria-hidden>🧭</span>
          <h1 className="font-display text-title font-bold">
            Esta sala no existe
          </h1>
          <p className="text-sm text-ink-muted">
            Puede que el link esté mal copiado o que la sala se haya borrado.
          </p>
          <Link
            to="/"
            className="mt-2 inline-flex items-center gap-1.5 h-10 px-4 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const isAdmin = !!user && user.uid === room?.createdBy

  // Votacion: los votos de cada uno estan en su users/{uid}
  const voting = room?.voting ?? null
  const liveCardIds = new Set(cards.filter((c) => !c.deleted).map((c) => c.id))
  const me = participants.find((p) => p.id === user?.uid)
  const myByCard = voting ? votesOf(me, voting.round, liveCardIds) : {}
  const votesLeft = voting
    ? Math.max(0, voting.votesPerPerson - sumVotes(myByCard))
    : 0
  const voteTotals = voting
    ? tallyVotes(participants, voting.round, liveCardIds)
    : new Map<string, number>()

  function handleVote(cardId: string, delta: 1 | -1) {
    if (!roomId || !user || !voting) return
    castVote({
      roomId,
      uid: user.uid,
      round: voting.round,
      myRound: me?.votes?.round,
      cardId,
      delta,
    }).catch((e) => console.error('castVote failed', e))
  }

  async function handleOpenVoting() {
    if (!roomId) return
    if (
      voting?.state === 'closed' &&
      !confirm('¿Arrancar otra votación? Los votos de la anterior se descartan.')
    ) {
      return
    }
    try {
      await openVoting(roomId)
    } catch (e) {
      console.error('openVoting failed', e)
    }
  }

  async function handleCloseVoting() {
    if (!roomId || !room) return
    try {
      await closeVoting({
        roomId,
        cards,
        totals: voteTotals,
        skipColumnId: getActionablesColumn(room.columns)?.id ?? null,
      })
    } catch (e) {
      console.error('closeVoting failed', e)
    }
  }

  async function handleClearVoting() {
    if (!roomId) return
    try {
      await clearVoting(roomId)
    } catch (e) {
      console.error('clearVoting failed', e)
    }
  }

  const actionablesId = room ? getActionablesColumn(room.columns)?.id ?? null : null
  const presenters = presentation
    ? presentersOf(cards, actionablesId, presentation.order)
    : []
  const presenterUids = presenters.map((p) => p.uid)

  function savePresentation(next: PresentationState) {
    if (!roomId) return
    setPresentation(roomId, next).catch((e) =>
      console.error('setPresentation failed', e),
    )
  }

  function handleStartPresentation() {
    const uids = presentersOf(cards, actionablesId, []).map((p) => p.uid)
    savePresentation(startState(uids))
  }

  function handleEndPresentation() {
    if (!roomId) return
    endPresentation(roomId).catch((e) => console.error('endPresentation failed', e))
  }

  const boardVoting: BoardVoting | null =
    room?.revealed && voting
      ? {
          state: voting.state,
          maxPerCard: voting.maxPerCard,
          left: votesLeft,
          myByCard,
          totals: voting.state === 'closed' ? voteTotals : null,
          onVote: handleVote,
        }
      : null

  // Desde md la sala ocupa exactamente la pantalla: header arriba y el
  // tablero llena el resto con su propio scroll. Así filtrar por persona
  // cambia las tarjetas sin mover la página. En celular se scrollea la página.
  return (
    <div className="min-h-full md:h-dvh md:flex md:flex-col md:overflow-hidden">
      <header className="sm:sticky md:static top-0 z-30 flex-shrink-0 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="px-page py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <div className="order-1 flex items-center gap-3 min-w-0 flex-1 basis-40">
            <Link
              to="/"
              className="flex-shrink-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Ir al inicio de retritoboard"
              title="Inicio"
            >
              <LogoMark className="size-8" />
            </Link>
            <span className="h-6 w-px bg-line flex-shrink-0" aria-hidden />
            <div className="flex items-center gap-2 min-w-0">
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
                  aria-label="Nombre de la retro"
                  className={cx(FIELD, 'h-9 px-2 -ml-2 min-w-0 w-72 max-w-full font-display text-lg font-bold')}
                />
              ) : (
                <h1
                  className={cx(
                    'font-display text-lg sm:text-title font-bold text-ink truncate',
                    isAdmin &&
                      'cursor-text rounded-control px-2 -mx-2 hover:bg-surface-muted transition',
                  )}
                  onClick={() => {
                    if (!isAdmin) return
                    setRoomNameDraft(room?.name ?? '')
                    setEditingRoomName(true)
                  }}
                  title={isAdmin ? 'Click para renombrar' : room?.name || 'Retro'}
                >
                  {room?.name || 'Retro'}
                </h1>
              )}
              {isAdmin && !editingRoomName && (
                <span className="hidden sm:flex">
                  <AdminBadge />
                </span>
              )}
            </div>
          </div>
          {/* En celular y iPad vertical: título + compartir/tema arriba, y los controles de
              la retro en su propia fila. Desde lg, todo en una fila. */}
          {joined && room && (
            <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Timer roomId={roomId!} timer={room.timer} isAdmin={isAdmin} />
              {isAdmin && (
                <Button
                  onClick={toggleReveal}
                  variant={room.revealed ? 'secondary' : 'primary'}
                >
                  {room.revealed ? <EyeOff /> : <Eye />}
                  {room.revealed ? 'Ocultar' : 'Revelar'}
                </Button>
              )}
              {isAdmin && room.revealed && !presentation && (
                <Button variant="soft" onClick={handleStartPresentation}>
                  <Presentation />
                  Presentar
                </Button>
              )}
              {isAdmin && room.revealed && (
                <VotingButton
                  voting={voting}
                  onOpen={handleOpenVoting}
                  onClose={handleCloseVoting}
                />
              )}
            </div>
          )}
          <div className="order-2 lg:order-3 flex items-center gap-2">
            <Button onClick={copyLink} aria-label="Copiar link de la sala">
              {copyOk ? <Check className="text-emerald-600" /> : <Link2 />}
              <span className="hidden md:inline">
                {copyOk ? 'Copiado' : 'Copiar link'}
              </span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* pb-24: que lo último del tablero no quede tapado por el botón flotante
          de feedback. Desde md el feedback flota sobre la columna de participantes */}
      <div className="px-page pt-4 sm:pt-5 pb-24 md:pb-4 md:flex-1 md:min-h-0 md:overflow-y-auto md:flex md:flex-col">
        {joined && room && !room.revealed && (
          <Banner tone="amber" icon="✍️" className="mb-4">
            <strong className="font-semibold">Modo escritura.</strong> Cada uno
            ve solo sus tarjetas hasta que el admin las revele.
          </Banner>
        )}

        {joined && room && room.revealed && voting && (
          <VotingBanner
            voting={voting}
            left={votesLeft}
            people={participants.map((p) => ({
              isMe: p.id === user?.uid,
              lastSeenMs: p.lastSeen?.toMillis() ?? null,
              used: sumVotes(votesOf(p, voting.round, liveCardIds)),
            }))}
            isAdmin={isAdmin}
            onClear={handleClearVoting}
          />
        )}

        {joined && user && presentation && (
          <PresentationBar
            presenters={presenters}
            state={presentation}
            lastSeenByUid={
              new Map(participants.map((p) => [p.id, p.lastSeen?.toMillis() ?? null]))
            }
            currentUid={user.uid}
            isAdmin={isAdmin}
            onNext={() => savePresentation(goNext(presentation, presenterUids))}
            onPrev={() => savePresentation(goPrev(presentation, presenterUids))}
            onJump={(uid) => savePresentation(goTo(presentation, presenterUids, uid))}
            onToggleDone={(uid) =>
              savePresentation(toggleDone(presentation, presenterUids, uid))
            }
            onEnd={handleEndPresentation}
          />
        )}

        {joined && room && room.revealed && !voting && !presentation && (
          <Banner tone="emerald" icon="👀" className="mb-4">
            <strong className="font-semibold">Modo revisión.</strong> Todas las
            tarjetas están a la vista. Discutan, reaccionen y prioricen.
          </Banner>
        )}

        {!joined ? (
          <div className={cx(PANEL, 'max-w-md mx-auto mt-6 sm:mt-14 shadow-raised p-6 sm:p-8')}>
            <h2 className="font-display text-title font-bold text-ink">
              ¿Cómo te llamás?
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Así te ven los demás en la retro.
              {room &&
                !room.revealed &&
                ' Lo que escribas queda oculto hasta que se revelen las tarjetas.'}
            </p>
            <form onSubmit={handleJoin} className="mt-5 flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 flex">
                  <Avatar
                    name={name || '?'}
                    size="sm"
                    className={cx('transition-opacity', !name.trim() && 'opacity-30')}
                  />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  aria-label="Tu nombre"
                  autoFocus
                  maxLength={40}
                  className={cx(FIELD, 'w-full h-11 pl-12 pr-3.5 text-body')}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!name.trim() || joining}
                className="w-full"
              >
                {joining && <Spinner />}
                {joining ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </div>
        ) : (
          room &&
          user && (
            <main className="md:flex-1 md:min-h-0 md:flex md:flex-col">
              <FilterBar
                users={participants}
                search={search}
                onSearchChange={setSearch}
                // En la presentación el filtro por persona lo maneja la barra
                selectedUids={presentation ? NO_UIDS : selectedUids}
                onToggleUid={toggleUid}
                onClearAll={clearFilters}
                actions={
                  isAdmin && (
                    <Button
                      variant="dashed"
                      onClick={handleAddColumn}
                      aria-label="Agregar columna"
                    >
                      <Plus />
                      <span className="hidden sm:inline">Columna</span>
                    </Button>
                  )
                }
              />
              <div className="flex flex-col md:flex-row gap-4 lg:gap-5 md:flex-1 md:min-h-0">
                <div className="flex-1 min-w-0 md:min-h-0">
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
                    selectedUids={boardSelectedUids}
                    presenting={!!presentation}
                    voting={boardVoting}
                  />
                </div>
                {/* En la presentación la barra de arriba hace de lista de gente
                    (fija, sin reordenarse) y el tablero usa todo el ancho */}
                {!presentation && (
                  <Participants
                    users={participants}
                    error={participantsError}
                    adminUid={room.createdBy}
                    currentUid={user.uid}
                    selectedUids={selectedUids}
                    onToggleUid={toggleUid}
                  />
                )}
              </div>
            </main>
          )
        )}
      </div>
    </div>
  )
}
