import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function sendFeedback(opts: {
  uid: string
  message: string
  route?: string
}) {
  const message = opts.message.trim()
  if (!message) throw new Error('El mensaje está vacío')
  if (message.length > 2000) throw new Error('Máximo 2000 caracteres')

  await addDoc(collection(db, 'feedback'), {
    uid: opts.uid,
    message,
    route: opts.route ?? '',
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '',
    createdAt: serverTimestamp(),
  })
}
