import {
  addDoc,
  arrayRemove,
  collection,
  deleteField,
  doc,
  FieldPath,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ReactionToggle } from './reactions'

export async function createCard(opts: {
  roomId: string
  columnId: string
  authorUid: string
  authorName: string
  content: string
  order: number
  mediaUrl?: string
  mediaType?: 'gif'
  copiedFrom?: string
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
  if (opts.copiedFrom) data.copiedFrom = opts.copiedFrom
  await addDoc(collection(db, 'rooms', opts.roomId, 'cards'), data)
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

// Soft-delete: marca la tarjeta como borrada en vez de eliminar el doc, para
// dejar rastro auditable. Solo autor o admin pueden hacerlo (firestore.rules).
export async function deleteCard(opts: {
  roomId: string
  cardId: string
  deletedBy: string
  deletedByName: string
}) {
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), {
    deleted: true,
    deletedBy: opts.deletedBy,
    deletedByName: opts.deletedByName,
    deletedAt: serverTimestamp(),
  })
}

// Revierte el soft-delete. Autor o admin.
export async function restoreCard(opts: { roomId: string; cardId: string }) {
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), {
    deleted: deleteField(),
    deletedBy: deleteField(),
    deletedByName: deleteField(),
    deletedAt: deleteField(),
  })
}

// Pone o saca una reacción (ver planToggle en reactions.ts). Cada uno escribe
// solo dentro de reactionsBy.{su uid}, así no pisa lo que otros reaccionan al
// mismo tiempo. FieldPath porque el emoji no es un nombre de campo simple.
export async function toggleReaction(opts: {
  roomId: string
  cardId: string
  uid: string
  toggle: ReactionToggle
}) {
  const { add, emojiKey, legacyKey } = opts.toggle
  const rest: unknown[] = []
  if (legacyKey) rest.push(new FieldPath('reactions', legacyKey), arrayRemove(opts.uid))
  await updateDoc(
    doc(db, 'rooms', opts.roomId, 'cards', opts.cardId),
    new FieldPath('reactionsBy', opts.uid, emojiKey),
    add ? Date.now() : deleteField(),
    ...rest,
  )
}
