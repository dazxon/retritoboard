import type { Timestamp } from 'firebase/firestore'
import type { ColorKey } from './colors'
import type { CardReactions } from './reactions'

export type Column = {
  id: string
  title: string
  order: number
  color?: ColorKey
  isActionables?: boolean
}

export type TimerState = {
  state: 'idle' | 'running' | 'finished'
  endsAt: Timestamp | null
  durationSec: number
}

// Votación con límite. Los votos de cada uno viven en su users/{uid} (cada
// uno solo escribe el suyo). round cambia en cada votación nueva y descarta
// los votos de rondas anteriores sin tener que borrarlos.
export type VotingState = {
  state: 'open' | 'closed'
  round: string
  votesPerPerson: number
  maxPerCard: number
}

export type Room = {
  name: string
  createdBy: string
  createdAt: Timestamp
  columns: Column[]
  revealed: boolean
  timer: TimerState
  voting?: VotingState | null
}

export type Card = {
  columnId: string
  authorUid: string
  authorName: string
  content: string
  createdAt: Timestamp
  order: number
  mediaUrl?: string
  mediaType?: 'gif'
  // Id de la tarjeta original cuando se copió con "Copiar a accionables"
  copiedFrom?: string
  // { like: [uid, ...] }. Cualquiera puede tocar solo su uid (firestore.rules)
  reactions?: CardReactions
  // Soft-delete: la tarjeta no se borra de Firestore, se marca y deja de
  // mostrarse a todos (queda restaurable desde la consola). deletedByName va
  // denormalizado igual que authorName para no depender de join/presencia.
  deleted?: boolean
  deletedBy?: string
  deletedByName?: string
  deletedAt?: Timestamp
}

export type RoomUser = {
  name: string
  joinedAt: Timestamp
  lastSeen?: Timestamp
  votes?: { round: string; byCard: Record<string, number> }
}
