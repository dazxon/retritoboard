import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

// Set fijo de reacciones. Las keys son ASCII (no el emoji) para que las field
// paths y las rules sean simples, y para poder cambiar el glifo sin migrar
// datos. Si se agrega o saca una key, actualizar REACTION_KEYS en
// firestore.rules (validReactions).
export const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'De acuerdo' },
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'laugh', emoji: '😂', label: 'Jaja' },
  { key: 'party', emoji: '🎉', label: 'Festejo' },
  { key: 'think', emoji: '🤔', label: 'Hay que charlarlo' },
  { key: 'rocket', emoji: '🚀', label: 'A full' },
] as const

export type ReactionKey = (typeof REACTIONS)[number]['key']

// reactions: { like: [uid, uid], party: [uid] }
export type CardReactions = Partial<Record<ReactionKey, string[]>>

// Toggle atómico: arrayUnion/arrayRemove no pisan las reacciones que otros
// estén poniendo al mismo tiempo.
export async function toggleReaction(opts: {
  roomId: string
  cardId: string
  key: ReactionKey
  uid: string
  active: boolean
}) {
  await updateDoc(doc(db, 'rooms', opts.roomId, 'cards', opts.cardId), {
    [`reactions.${opts.key}`]: opts.active
      ? arrayRemove(opts.uid)
      : arrayUnion(opts.uid),
  })
}
