import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Card } from './types'

// "Estoy listo" en la fase de escritura: cada uno marca (o desmarca) en su
// users/{uid}.ready que ya terminó de escribir, y todos ven cuántas tarjetas
// lleva cada uno. Es solo una guía para el admin: no bloquea Revelar.

export const ONLINE_WINDOW_MS = 75_000

export function isOnlineAt(
  lastSeenMs: number | null | undefined,
  now: number,
  isMe = false,
): boolean {
  if (isMe) return true
  return !!lastSeenMs && now - lastSeenMs < ONLINE_WINDOW_MS
}

// Tarjetas vivas de cada autor, sin contar Accionables (ahí van resúmenes y
// copias, no lo que cada uno escribió)
export function cardCountsByAuthor(
  cards: Array<Pick<Card, 'authorUid' | 'columnId' | 'deleted'>>,
  actionablesId: string | null,
): Map<string, number> {
  const m = new Map<string, number>()
  for (const c of cards) {
    if (c.deleted || c.columnId === actionablesId) continue
    m.set(c.authorUid, (m.get(c.authorUid) ?? 0) + 1)
  }
  return m
}

// "3/5 listos": de los que están en línea. Si alguien marcó listo y se fue,
// no cuenta para ninguno de los dos lados
export function readySummary(
  people: Array<{ ready?: boolean; online: boolean }>,
): { ready: number; total: number } {
  const online = people.filter((p) => p.online)
  return { ready: online.filter((p) => p.ready).length, total: online.length }
}

export async function setReady(roomId: string, uid: string, ready: boolean) {
  await updateDoc(doc(db, 'rooms', roomId, 'users', uid), {
    ready: ready ? true : deleteField(),
  })
}
