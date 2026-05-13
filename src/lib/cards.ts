import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'

const ORDER_STEP = 1000

export function nextOrder(maxOrderInColumn: number | null) {
  return (maxOrderInColumn ?? 0) + ORDER_STEP
}

export async function createCard(opts: {
  roomId: string
  columnId: string
  authorUid: string
  authorName: string
  content: string
  order: number
  mediaUrl?: string
  mediaType?: 'gif'
}) {
  const data: Record<string, unknown> = {
    columnId: opts.columnId,
    authorUid: opts.authorUid,
    authorName: opts.authorName,
    content: opts.content.trim(),
    order: opts.order,
    createdAt: serverTimestamp(),
  }
  if (opts.mediaUrl) data.mediaUrl = opts.mediaUrl
  if (opts.mediaType) data.mediaType = opts.mediaType
  await addDoc(collection(db, 'rooms', opts.roomId, 'cards'), data)
}

export async function updateCardContent(opts: {
  roomId: string
  cardId: string
  content: string
}) {
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), {
    content: opts.content.trim(),
  })
}

// content y/o media. mediaUrl: string => set, null => quita, undefined => deja igual
export async function updateCard(opts: {
  roomId: string
  cardId: string
  content?: string
  mediaUrl?: string | null
}) {
  const data: Record<string, unknown> = {}
  if (opts.content !== undefined) data.content = opts.content.trim()
  if (opts.mediaUrl !== undefined) {
    if (opts.mediaUrl === null) {
      data.mediaUrl = deleteField()
      data.mediaType = deleteField()
    } else {
      data.mediaUrl = opts.mediaUrl
      data.mediaType = 'gif'
    }
  }
  if (Object.keys(data).length === 0) return
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), data)
}

export async function moveCard(opts: {
  roomId: string
  cardId: string
  columnId: string
  order: number
}) {
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), {
    columnId: opts.columnId,
    order: opts.order,
  })
}

export async function deleteCard(opts: { roomId: string; cardId: string }) {
  await deleteDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId))
}
