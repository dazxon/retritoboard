import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Card, Column } from '../lib/types'
import { ColumnView } from './ColumnView'
import { moveCard } from '../lib/cards'
import { addColumn } from '../lib/columns'

type CardWithId = Card & { id: string }

type Props = {
  roomId: string
  columns: Column[]
  currentUid: string
  currentName: string
  isAdmin: boolean
}

export function Board({
  roomId,
  columns,
  currentUid,
  currentName,
  isAdmin,
}: Props) {
  const [cards, setCards] = useState<CardWithId[]>([])
  const [cardsError, setCardsError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'rooms', roomId, 'cards'), orderBy('order'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCardsError(null)
        setCards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Card) })))
      },
      (err) => {
        console.error('Cards subscribe error', err)
        setCardsError(err.message)
      },
    )
    return unsub
  }, [roomId])

  const sortedColumns = useMemo(
    () => columns.slice().sort((a, b) => a.order - b.order),
    [columns],
  )

  const cardsByColumn = useMemo(() => {
    const m = new Map<string, CardWithId[]>()
    for (const col of columns) m.set(col.id, [])
    for (const card of cards) {
      const arr = m.get(card.columnId)
      if (arr) arr.push(card)
    }
    return m
  }, [cards, columns])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const card = cards.find((c) => c.id === active.id)
    if (!card) return

    // Determinar columna destino + nuevo order
    let destColumnId: string
    let destCards: CardWithId[]
    let overIndex: number

    const overData = over.data.current as
      | { type: 'card'; columnId: string }
      | { type: 'column'; columnId: string }
      | undefined

    if (overData?.type === 'column') {
      destColumnId = overData.columnId
      destCards = cardsByColumn.get(destColumnId) ?? []
      overIndex = destCards.length // al final
    } else if (overData?.type === 'card') {
      destColumnId = overData.columnId
      destCards = cardsByColumn.get(destColumnId) ?? []
      overIndex = destCards.findIndex((c) => c.id === over.id)
      if (overIndex < 0) overIndex = destCards.length
    } else {
      return
    }

    // Calcular order nuevo
    const withoutSelf = destCards.filter((c) => c.id !== card.id)
    const clampedIndex = Math.max(0, Math.min(overIndex, withoutSelf.length))
    const before = withoutSelf[clampedIndex - 1]
    const after = withoutSelf[clampedIndex]

    let newOrder: number
    if (!before && !after) newOrder = 1000
    else if (!before && after) newOrder = after.order - 1000
    else if (before && !after) newOrder = before.order + 1000
    else newOrder = (before!.order + after!.order) / 2

    if (
      card.columnId === destColumnId &&
      Math.abs(card.order - newOrder) < 0.0001
    ) {
      return
    }

    try {
      await moveCard({
        roomId,
        cardId: card.id,
        columnId: destColumnId,
        order: newOrder,
      })
    } catch (err) {
      console.error('moveCard failed', err)
    }
  }

  async function handleAddColumn() {
    try {
      await addColumn(roomId, columns)
    } catch (e) {
      console.error('addColumn failed', e)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      {cardsError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200">
          <strong>Error cargando tarjetas:</strong> {cardsError}
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {sortedColumns.map((col) => (
          <ColumnView
            key={col.id}
            column={col}
            columns={columns}
            cards={cardsByColumn.get(col.id) ?? []}
            roomId={roomId}
            currentUid={currentUid}
            currentName={currentName}
            isAdmin={isAdmin}
          />
        ))}
        {isAdmin && (
          <button
            type="button"
            onClick={handleAddColumn}
            className="flex-shrink-0 w-72 h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 hover:text-violet-600 transition text-sm font-medium"
          >
            + Agregar columna
          </button>
        )}
      </div>
    </DndContext>
  )
}
