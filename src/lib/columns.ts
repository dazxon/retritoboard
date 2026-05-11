import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from './firebase'
import type { Column } from './types'

export async function setColumns(roomId: string, columns: Column[]) {
  await updateDoc(doc(db, 'rooms', roomId), { columns })
}

export async function addColumn(roomId: string, currentColumns: Column[]) {
  const order =
    (currentColumns.length
      ? Math.max(...currentColumns.map((c) => c.order))
      : -1) + 1
  const next: Column[] = [
    ...currentColumns,
    { id: nanoid(6), title: 'Nueva columna', order },
  ]
  await setColumns(roomId, next)
}

export async function renameColumn(
  roomId: string,
  currentColumns: Column[],
  columnId: string,
  title: string,
) {
  const next = currentColumns.map((c) =>
    c.id === columnId ? { ...c, title: title.trim() || c.title } : c,
  )
  await setColumns(roomId, next)
}

export async function deleteColumn(
  roomId: string,
  currentColumns: Column[],
  columnId: string,
) {
  // Borra cards de esa columna en batch
  const cardsRef = collection(db, 'rooms', roomId, 'cards')
  const q = query(cardsRef, where('columnId', '==', columnId))
  const snap = await getDocs(q)

  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  batch.update(doc(db, 'rooms', roomId), {
    columns: currentColumns.filter((c) => c.id !== columnId),
  })
  await batch.commit()
}
