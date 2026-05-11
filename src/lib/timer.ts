import { Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function startTimer(roomId: string, durationSec: number) {
  await updateDoc(doc(db, 'rooms', roomId), {
    timer: {
      state: 'running',
      endsAt: Timestamp.fromMillis(Date.now() + durationSec * 1000),
      durationSec,
    },
  })
}

export async function pauseTimer(roomId: string, remainingSec: number) {
  await updateDoc(doc(db, 'rooms', roomId), {
    timer: {
      state: 'idle',
      endsAt: null,
      durationSec: Math.max(0, Math.round(remainingSec)),
    },
  })
}

export async function resetTimer(roomId: string, defaultSec = 600) {
  await updateDoc(doc(db, 'rooms', roomId), {
    timer: {
      state: 'idle',
      endsAt: null,
      durationSec: defaultSec,
    },
  })
}
