import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from './firebase'

const DEFAULT_COLUMN_TITLES = [
  'Lo que estuvo bien',
  'Lo que mejorar',
  'Action items',
]

export async function createRoom(opts: { name: string; createdBy: string }) {
  const roomId = nanoid(8)
  const columns = DEFAULT_COLUMN_TITLES.map((title, i) => ({
    id: nanoid(6),
    title,
    order: i,
  }))
  await setDoc(doc(db, 'rooms', roomId), {
    name: opts.name.trim() || 'Retro',
    createdBy: opts.createdBy,
    createdAt: serverTimestamp(),
    columns,
    revealed: false,
    timer: { state: 'idle', endsAt: null, durationSec: 600 },
  })
  return roomId
}

export async function joinRoom(opts: {
  roomId: string
  uid: string
  name: string
}) {
  await setDoc(doc(db, 'rooms', opts.roomId, 'users', opts.uid), {
    name: opts.name.trim(),
    joinedAt: serverTimestamp(),
  })
}
