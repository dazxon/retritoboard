import {
  FieldPath,
  deleteField,
  doc,
  increment,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from './firebase'
import type { Card, RoomUser, VotingState } from './types'

// Defaults tipo Parabol: 5 votos por persona, hasta 3 en la misma tarjeta
export const VOTES_PER_PERSON = 5
export const MAX_VOTES_PER_CARD = 3

type CardWithId = Card & { id: string }
type UserWithId = RoomUser & { id: string }

// Lo que Board necesita para pintar los votos de cada tarjeta
export type BoardVoting = {
  state: VotingState['state']
  maxPerCard: number
  left: number
  myByCard: Record<string, number>
  // Solo con la votacion cerrada: mientras esta abierta los totales no se ven
  totals: Map<string, number> | null
  onVote: (cardId: string, delta: 1 | -1) => void
}

// Admin. Arranca una ronda nueva: los votos de rondas anteriores dejan de contar.
export async function openVoting(roomId: string) {
  const voting: VotingState = {
    state: 'open',
    round: nanoid(6),
    votesPerPerson: VOTES_PER_PERSON,
    maxPerCard: MAX_VOTES_PER_CARD,
  }
  await updateDoc(doc(db, 'rooms', roomId), { voting })
}

// Admin. Cierra la votacion y reordena cada columna (salvo accionables) de mas
// a menos votada, para que todos vean el mismo orden y el drag siga andando.
export async function closeVoting(opts: {
  roomId: string
  cards: CardWithId[]
  totals: Map<string, number>
  skipColumnId: string | null
}) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'rooms', opts.roomId), { 'voting.state': 'closed' })

  const byColumn = new Map<string, CardWithId[]>()
  for (const c of opts.cards) {
    if (c.deleted || c.columnId === opts.skipColumnId) continue
    const arr = byColumn.get(c.columnId) ?? []
    arr.push(c)
    byColumn.set(c.columnId, arr)
  }
  for (const arr of byColumn.values()) {
    // sort es estable: con empate queda el orden que tenian
    const sorted = arr
      .slice()
      .sort((a, b) => a.order - b.order)
      .sort((a, b) => (opts.totals.get(b.id) ?? 0) - (opts.totals.get(a.id) ?? 0))
    sorted.forEach((c, i) => {
      const order = (i + 1) * 1000
      if (c.order !== order) {
        batch.update(doc(db, 'rooms', opts.roomId, 'cards', c.id), { order })
      }
    })
  }
  await batch.commit()
}

// Admin. Saca la votacion (y los numeritos) de la sala.
export async function clearVoting(roomId: string) {
  await updateDoc(doc(db, 'rooms', roomId), { voting: deleteField() })
}

// Cada uno escribe solo en su users/{uid}, que firestore.rules ya permite.
export async function castVote(opts: {
  roomId: string
  uid: string
  round: string
  myRound: string | undefined
  cardId: string
  delta: 1 | -1
}) {
  const ref = doc(db, 'rooms', opts.roomId, 'users', opts.uid)
  if (opts.myRound !== opts.round) {
    // Primer voto de esta ronda: pisa los votos viejos
    if (opts.delta < 0) return
    await updateDoc(ref, {
      votes: { round: opts.round, byCard: { [opts.cardId]: 1 } },
    })
    return
  }
  await updateDoc(
    ref,
    new FieldPath('votes', 'byCard', opts.cardId),
    increment(opts.delta),
  )
}

// Votos de esta ronda de un usuario, solo sobre tarjetas que siguen vivas
export function votesOf(
  user: RoomUser | undefined,
  round: string,
  liveCardIds: Set<string>,
): Record<string, number> {
  if (!user?.votes || user.votes.round !== round) return {}
  const out: Record<string, number> = {}
  for (const [cardId, n] of Object.entries(user.votes.byCard ?? {})) {
    if (n > 0 && liveCardIds.has(cardId)) out[cardId] = n
  }
  return out
}

export function sumVotes(byCard: Record<string, number>) {
  return Object.values(byCard).reduce((a, b) => a + b, 0)
}

export function tallyVotes(
  users: UserWithId[],
  round: string,
  liveCardIds: Set<string>,
) {
  const totals = new Map<string, number>()
  for (const u of users) {
    for (const [cardId, n] of Object.entries(votesOf(u, round, liveCardIds))) {
      totals.set(cardId, (totals.get(cardId) ?? 0) + n)
    }
  }
  return totals
}
