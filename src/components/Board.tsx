import { Fragment, useMemo } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
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
import { Banner } from './ui/Banner'
import { createCard, moveCard } from '../lib/cards'
import { groupCardsByColumn } from '../lib/filterCards'
import { dropOrder, nextOrder } from '../lib/order'
import { getActionablesColumn, setColumns } from '../lib/columns'
import type { BoardVoting } from '../lib/voting'

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
  voting: BoardVoting | null
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
  voting,
}: Props) {
  const actionablesCol = useMemo(() => getActionablesColumn(columns), [columns])
  const actionablesId = actionablesCol?.id ?? null

  // Accionables siempre al final (a la derecha), independientemente del campo order
  const sortedColumns = useMemo(() => {
    const others = columns
      .filter((c) => c.id !== actionablesId)
      .sort((a, b) => a.order - b.order)
    return actionablesCol ? [...others, actionablesCol] : others
  }, [columns, actionablesCol, actionablesId])

  const cardsByColumn = useMemo(
    () =>
      groupCardsByColumn({ cards, columns, search, selectedUids, revealed, currentUid }),
    [cards, columns, search, selectedUids, revealed, currentUid],
  )

  // Max order por columna sobre TODAS las tarjetas (sin filtros ni busqueda),
  // para que una tarjeta nueva siempre caiga al final del orden compartido.
  const maxOrderByColumn = useMemo(() => {
    const m = new Map<string, number>()
    for (const card of cards) {
      const prev = m.get(card.columnId)
      if (prev === undefined || card.order > prev) m.set(card.columnId, card.order)
    }
    return m
  }, [cards])

  // Tarjetas que ya tienen copia viva en accionables (para no copiarlas dos veces)
  const copiedIds = useMemo(() => {
    const s = new Set<string>()
    for (const c of cards) {
      if (c.copiedFrom && !c.deleted && c.columnId === actionablesId) {
        s.add(c.copiedFrom)
      }
    }
    return s
  }, [cards, actionablesId])

  // Accionables completos para la vista de foto: sin filtros ni busqueda, pero
  // respetando modo escritura (antes de revelar solo se ven los propios)
  const photoCards = useMemo(
    () =>
      cards.filter(
        (c) =>
          c.columnId === actionablesId &&
          !c.deleted &&
          (revealed || c.authorUid === currentUid),
      ),
    [cards, actionablesId, revealed, currentUid],
  )

  // Copia la tarjeta (texto + GIF) al final de accionables. La original queda
  // donde estaba. El autor de la copia es quien la copia (firestore.rules).
  async function handleCopyToActionables(card: CardWithId) {
    if (!actionablesId) return
    try {
      await createCard({
        roomId,
        columnId: actionablesId,
        authorUid: currentUid,
        authorName: currentName,
        content: card.content,
        order: nextOrder(maxOrderByColumn.get(actionablesId) ?? null),
        mediaUrl: card.mediaUrl,
        mediaType: card.mediaType,
        copiedFrom: card.id,
      })
    } catch (err) {
      console.error('copy to actionables failed', err)
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: mantener apretado 200ms para arrastrar; deslizar sin esperar
    // scrollea el tablero como siempre.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
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

    // Reorden de columnas (admin). La columna de accionables no se mueve y nada queda detras de ella.
    if (activeData?.type === 'column') {
      if (activeData.columnId === actionablesId) return
      const targetColumnId = overData?.columnId
      if (!targetColumnId || targetColumnId === actionablesId) return
      const fromIdx = sortedColumns.findIndex((c) => c.id === activeData.columnId)
      const toIdx = sortedColumns.findIndex((c) => c.id === targetColumnId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
      const reordered = arrayMove(sortedColumns, fromIdx, toIdx)
      // Re-pin accionables al final por las dudas, despues renumerar order
      const pinned = actionablesCol
        ? [
            ...reordered.filter((c) => c.id !== actionablesId),
            actionablesCol,
          ]
        : reordered
      const next = pinned.map((c, i) => ({ ...c, order: (i + 1) * 1000 }))
      try {
        await setColumns(roomId, next)
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

    const newOrder = dropOrder(destCards, card.id, overIndex)

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      {cardsError && (
        <Banner tone="red" className="mb-4">
          <strong>Error cargando tarjetas:</strong> {cardsError}
        </Banner>
      )}
      <div className="flex items-start gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-px-4 sm:snap-none">
        <SortableContext
          items={sortedColumns.map((c) => `column:${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {sortedColumns.map((col) => {
            const isActionables = col.id === actionablesId
            return (
              <Fragment key={col.id}>
                <ColumnView
                  column={col}
                  columns={columns}
                  cards={cardsByColumn.get(col.id) ?? []}
                  maxOrder={maxOrderByColumn.get(col.id) ?? null}
                  roomId={roomId}
                  currentUid={currentUid}
                  currentName={currentName}
                  isAdmin={isAdmin}
                  revealed={revealed}
                  isActionables={isActionables}
                  // En accionables no se vota
                  voting={isActionables ? null : voting}
                  copiedIds={copiedIds}
                  onCopyToActionables={
                    actionablesId && !isActionables
                      ? handleCopyToActionables
                      : undefined
                  }
                  photoCards={isActionables ? photoCards : undefined}
                />
              </Fragment>
            )
          })}
        </SortableContext>
      </div>
    </DndContext>
  )
}
