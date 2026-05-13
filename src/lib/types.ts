import type { Timestamp } from 'firebase/firestore'
import type { ColorKey } from './colors'

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

export type Room = {
  name: string
  createdBy: string
  createdAt: Timestamp
  columns: Column[]
  revealed: boolean
  timer: TimerState
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
}

export type RoomUser = {
  name: string
  joinedAt: Timestamp
  lastSeen?: Timestamp
}
