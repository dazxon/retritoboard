import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Card, Column } from '../lib/types'
import { ColumnView } from './ColumnView'
import { moveCard } from '../lib/cards'
import { addColumn, setColumns } from '../lib/columns'

type CardWithId = Card & { id: string }

type Props = {
  roomId: string
  columns: Column[]
  cards: CardWithId[]
  cardsError: string | null
  currentUid: string
  currentName: string
  isAdmin: boolean
  revealed: boolean
  search: string
  selectedUids: Set<string>
}

export function Board({
  roomId,
  columns,
  cards,
  cardsError,
  currentUid,
  currentName,
  isAdmin,
  revealed,
  search,
  selectedUids,
}: Props) {
  const sortedColumns = useMemo(
    () => columns.slice().sort((a, b) => a.order - b.order),
    [columns],
  )

  const cardsByColumn = useMemo(() => {
    const s = search.toLowerCase().trim()
    const hasSearch = s !== ''
    const hasUidFilter = selectedUids.size > 0

    const m = new Map<string, CardWithId[]>()
    for (const col of columns) m.set(col.id, [])
    for (const card of cards) {
      if (hasUidFilter && !selectedUids.has(card.authorUid)) continue
      if (hasSearch) {
        const isOwn = card.authorUid === currentUid
        const isHiddenForMe = !revealed && !isOwn
        const haystack = isHiddenForMe
          ? card.authorName.toLowerCase()
          : (card.content + ' ' + card.authorName).toLowerCase()
        if (!haystack.includes(s)) continue
      }
      const arr = m.get(card.columnId)
      if (arr) arr.push(card)
    }
    return m
  }, [cards, columns, search, selectedUids, revealed, currentUid])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return

    const activeData = active.data.current as
      | { type: 'card'; columnId: string }
      | { type: 'column'; columnId: string }
      | undefined
    const overData = over.data.current as
      | { type: 'card'; columnId: string }
      | { type: 'column'; columnId: string }
      | undefined

    // Reorden de columnas (admin)
    if (activeData?.type === 'column') {
      const targetColumnId = overData?.columnId
      if (!targetColumnId) return
      const fromIdx = sortedColumns.findIndex((c) => c.id === activeData.columnId)
      const toIdx = sortedColumns.findIndex((c) => c.id === targetColumnId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
      const reordered = arrayMove(sortedColumns, fromIdx, toIdx).map((c, i) => ({
        ...c,
        order: (i + 1) * 1000,
      }))
      try {
        await setColumns(roomId, reordered)
      } catch (err) {
        console.error('reorder columns failed', err)
      }
      return
    }

    const card = cards.find((c) => c.id === active.id)
    if (!card) return

    // Determinar columna destino + nuevo order
    let destColumnId: string
    let destCards: CardWithId[]
    let overIndex: number

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
      <div className="flex items-start gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SortableContext
          items={sortedColumns.map((c) => `column:${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
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
              revealed={revealed}
            />
          ))}
        </SortableContext>
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
