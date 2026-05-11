import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from './firebase'
import type { ColorKey } from './colors'

const DEFAULT_COLUMNS: Array<{ title: string; color: ColorKey }> = [
  { title: 'Lo que estuvo bien', color: 'emerald' },
  { title: 'Lo que mejorar', color: 'amber' },
  { title: 'Action items', color: 'violet' },
]

export async function createRoom(opts: { name: string; createdBy: string }) {
  const roomId = nanoid(8)
  const columns = DEFAULT_COLUMNS.map((c, i) => ({
    id: nanoid(6),
    title: c.title,
    color: c.color,
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
    lastSeen: serverTimestamp(),
  })
}

export async function heartbeat(roomId: string, uid: string) {
  await updateDoc(doc(db, 'rooms', roomId, 'users', uid), {
    lastSeen: serverTimestamp(),
  })
}

export async function setRevealed(roomId: string, revealed: boolean) {
  await updateDoc(doc(db, 'rooms', roomId), { revealed })
}

export async function setRoomName(roomId: string, name: string) {
  await updateDoc(doc(db, 'rooms', roomId), {
    name: name.trim() || 'Retro',
  })
}
