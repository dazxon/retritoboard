import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Card, PresentationState } from './types'

type CardWithId = Card & { id: string }

// Modo presentación: después de revelar, cada uno presenta sus tarjetas por
// turno. El estado vive en rooms/{id}.presentation (lo escribe solo el admin,
// como el resto de la sala) y todos ven el mismo filtro y el mismo progreso.

export type Presenter = { uid: string; name: string; count: number }
export type PresenterStatus = 'current' | 'done' | 'pending'

// Los que presentan: quienes tienen tarjetas vivas fuera de accionables (las
// copias de accionables son de quien copia, no de quien escribió la original).
// El orden es el que se sorteó al arrancar; los que escriben después se suman
// al final, por su primera tarjeta, así la lista nunca se reacomoda.
export function presentersOf(
  cards: CardWithId[],
  actionablesId: string | null,
  order: string[],
): Presenter[] {
  const byUid = new Map<string, { name: string; count: number; first: number }>()
  for (const c of cards) {
    if (c.deleted || c.columnId === actionablesId) continue
    // createdAt es null hasta que el server confirma la tarjeta recién creada
    const t = c.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER
    const prev = byUid.get(c.authorUid)
    if (prev) {
      prev.count++
      prev.first = Math.min(prev.first, t)
    } else {
      byUid.set(c.authorUid, { name: c.authorName, count: 1, first: t })
    }
  }
  const known = order.filter((uid) => byUid.has(uid))
  const inOrder = new Set(known)
  const extra = [...byUid.keys()]
    .filter((uid) => !inOrder.has(uid))
    .sort((a, b) => byUid.get(a)!.first - byUid.get(b)!.first || a.localeCompare(b))
  return [...known, ...extra].map((uid) => {
    const { name, count } = byUid.get(uid)!
    return { uid, name, count }
  })
}

export function statusOf(state: PresentationState, uid: string): PresenterStatus {
  if (state.current === uid) return 'current'
  return state.done.includes(uid) ? 'done' : 'pending'
}

// Fisher-Yates. random se inyecta para poder testearlo.
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Arranca con el orden sorteado y el primero ya presentando
export function startState(uids: string[], random = Math.random): PresentationState {
  const order = shuffle(uids, random)
  return { order, current: order[0] ?? null, done: [] }
}

function withDone(done: string[], uid: string | null) {
  return uid && !done.includes(uid) ? [...done, uid] : done
}

function withoutDone(done: string[], uid: string) {
  return done.filter((d) => d !== uid)
}

// El primero que falta después del actual (dando la vuelta), o null si ya
// presentaron todos
export function nextPending(state: PresentationState, list: string[]): string | null {
  const start = state.current ? list.indexOf(state.current) : -1
  for (let i = 1; i <= list.length; i++) {
    const uid = list[(start + i + list.length) % list.length]
    if (uid !== state.current && !state.done.includes(uid)) return uid
  }
  return null
}

// Siguiente: el que estaba presentando queda como que ya presentó
export function goNext(state: PresentationState, list: string[]): PresentationState {
  return {
    order: list,
    current: nextPending(state, list),
    done: withDone(state.done, state.current),
  }
}

// Anterior: vuelve al de antes en la lista (y deja de figurar como que ya
// presentó, porque está presentando de nuevo). No marca al actual.
export function goPrev(state: PresentationState, list: string[]): PresentationState {
  const idx = state.current ? list.indexOf(state.current) : list.length
  if (idx <= 0) return state
  const uid = list[idx - 1]
  return { order: list, current: uid, done: withoutDone(state.done, uid) }
}

// Saltar a alguien: igual que Siguiente pero eligiendo a quién
export function goTo(
  state: PresentationState,
  list: string[],
  uid: string,
): PresentationState {
  if (state.current === uid) return state
  return {
    order: list,
    current: uid,
    done: withoutDone(withDone(state.done, state.current), uid),
  }
}

// Marcar o desmarcar a mano que alguien ya presentó
export function toggleDone(
  state: PresentationState,
  list: string[],
  uid: string,
): PresentationState {
  const done = state.done.includes(uid)
    ? withoutDone(state.done, uid)
    : withDone(state.done, uid)
  return { ...state, order: list, done }
}

export function isFinished(state: PresentationState, list: string[]) {
  return list.length > 0 && list.every((uid) => state.done.includes(uid))
}

// Escrituras (admin). Se guarda el estado entero: es chico y así nunca queda
// a medias si dos clicks se cruzan.
export async function setPresentation(roomId: string, presentation: PresentationState) {
  await updateDoc(doc(db, 'rooms', roomId), { presentation })
}

export async function endPresentation(roomId: string) {
  await updateDoc(doc(db, 'rooms', roomId), { presentation: deleteField() })
}
