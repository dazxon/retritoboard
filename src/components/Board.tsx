import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Card, Column } from '../lib/types'
import { ColumnView } from './ColumnView'
import { CardDragPreview } from './CardView'
import { Banner } from './ui/Banner'
import { cx } from './ui/cx'
import { getColor } from '../lib/colors'
import { createCard, moveCard } from '../lib/cards'
import {
  groupCardsByColumn,
  liveCardCountByColumn,
  viewBlockOf,
} from '../lib/filterCards'
import { dropOrder, nextOrder } from '../lib/order'
import { getActionablesColumn, setColumns } from '../lib/columns'
import { cardVoteProps, type BoardVoting } from '../lib/voting'
import { useFilterTransition } from '../lib/useFilterTransition'

type CardWithId = Card & { id: string }

type DragData = { type: 'card' | 'column'; columnId: string } | undefined

// Al soltar, la copia que viaja con el cursor vuela a su lugar y se endereza
// (data-dropping, ver .card-lift en index.css). La tarjeta real queda
// invisible hasta que la copia aterriza encima.
const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: (params) => {
    params.dragOverlay.node.setAttribute('data-dropping', '')
    return defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0' } },
    })(params)
  },
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

type Props = {
  roomId: string
  // Va en el subtítulo de la imagen de accionables
  columns: Column[]
  cards: CardWithId[]
  cardsError: string | null
  currentUid: string
  currentName: string
  // Para mostrar quién reaccionó en cada tarjeta
  userNames: Map<string, string>
  isAdmin: boolean
  revealed: boolean
  search: string
  selectedUids: Set<string>
  // Modo presentación: accionables no se filtra por quien presenta
  presenting?: boolean
  voting: BoardVoting | null
}

export function Board({
  roomId,
  columns,
  cards,
  cardsError,
  currentUid,
  currentName,
  userNames,
  isAdmin,
  revealed,
  search,
  selectedUids,
  presenting = false,
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

  // El filtro por persona entra con transición: mientras salen las tarjetas
  // se sigue mostrando el filtro anterior
  const { appliedUids, motion } = useFilterTransition(selectedUids)

  // Arrastre de tarjetas. Mientras se arrastra, la tarjeta se muestra en la
  // columna sobre la que está (`moving`), así el hueco viaja con ella y al
  // soltar la copia aterriza en su lugar final. Queda puesto hasta que
  // Firestore confirma el movimiento, para que no vuelva a la columna vieja
  // ni un instante.
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [dragOrigin, setDragOrigin] = useState<string | null>(null)
  const [moving, setMoving] = useState<{
    id: string
    columnId: string
    order: number
  } | null>(null)
  const viewCards = useMemo(
    () =>
      moving
        ? cards.map((c) =>
            c.id === moving.id
              ? { ...c, columnId: moving.columnId, order: moving.order }
              : c,
          )
        : cards,
    [cards, moving],
  )

  const cardsByColumn = useMemo(
    () =>
      groupCardsByColumn({
        cards: viewCards,
        columns,
        search,
        selectedUids: appliedUids,
        revealed,
        currentUid,
        unfilteredColumnId: presenting ? actionablesId : null,
      }),
    [viewCards, columns, search, appliedUids, revealed, currentUid, presenting, actionablesId],
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

  // Para el confirm de borrar columna: cuenta lo que se borra, no lo filtrado
  const liveCountByColumn = useMemo(() => liveCardCountByColumn(cards), [cards])

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

  // Accionables completos para compartir como imagen: sin filtros ni busqueda, pero
  // respetando modo escritura (antes de revelar solo se ven los propios)
  const shareCards = useMemo(
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

  // Celular: se ve una columna por vez. Los chips de arriba saltan a cada una
  // y marcan en cuál estás.
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Al cambiar de persona, las tarjetas nuevas arrancan desde arriba (el
  // cambio pasa mientras están invisibles, entre la salida y la entrada)
  useLayoutEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0
  }, [appliedUids])
  const [visibleColId, setVisibleColId] = useState<string | null>(null)
  const activeColId = visibleColId ?? sortedColumns[0]?.id

  function columnEls() {
    return Array.from(
      scrollerRef.current?.querySelectorAll<HTMLElement>('[data-column-id]') ?? [],
    )
  }

  function jumpToColumn(columnId: string) {
    const el = columnEls().find((e) => e.dataset.columnId === columnId)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  function handleBoardScroll() {
    const scroller = scrollerRef.current
    if (!scroller) return
    const left = scroller.getBoundingClientRect().left
    let best: string | null = null
    let bestDist = Infinity
    for (const el of columnEls()) {
      const dist = Math.abs(el.getBoundingClientRect().left - left)
      if (dist < bestDist) {
        bestDist = dist
        best = el.dataset.columnId ?? null
      }
    }
    if (best !== visibleColId) setVisibleColId(best)
  }

  const nameOf = (uid: string) => userNames.get(uid)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: mantener apretado 200ms para arrastrar; deslizar sin esperar
    // scrollea el tablero como siempre.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  )

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragData
    if (data?.type !== 'card') return
    setActiveCardId(String(e.active.id))
    setDragOrigin(data.columnId)
    setMoving(null)
    // Un toquecito al levantar la tarjeta en touch (Android; iOS no vibra)
    if (typeof TouchEvent !== 'undefined' && e.activatorEvent instanceof TouchEvent) {
      navigator.vibrate?.(8)
    }
  }

  // Al pasar a otra columna la tarjeta se muda ahí (solo en la vista), en la
  // posición sobre la que está el cursor. Dentro de una misma columna el
  // reacomodo lo hace SortableContext.
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeData = active.data.current as DragData
    const overData = over.data.current as DragData
    if (activeData?.type !== 'card' || !overData) return
    const destColumnId = overData.columnId
    const card = viewCards.find((c) => c.id === active.id)
    if (!card || card.columnId === destColumnId) return

    const destCards = cardsByColumn.get(destColumnId) ?? []
    let index = destCards.length
    if (overData.type === 'card') {
      const i = destCards.findIndex((c) => c.id === over.id)
      if (i >= 0) {
        const dragged = active.rect.current.translated
        const below =
          !!dragged && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2
        index = i + (below ? 1 : 0)
      }
    }
    setMoving({
      id: card.id,
      columnId: destColumnId,
      order: dropOrder(destCards, card.id, index, viewBlockOf(card, revealed, currentUid)),
    })
  }

  function handleDragCancel() {
    setActiveCardId(null)
    setDragOrigin(null)
    setMoving(null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveCardId(null)
    setDragOrigin(null)
    const { active, over } = e
    const activeData = active.data.current as DragData
    if (activeData?.type === 'card') {
      const target = cardDropTarget(e)
      if (!target) {
        setMoving(null)
        return
      }
      const { cardId, columnId, order } = target
      setMoving({ id: cardId, columnId, order })
      try {
        await moveCard({ roomId, cardId, columnId, order })
      } catch (err) {
        console.error('moveCard failed', err)
      } finally {
        // Firestore ya trae la posición nueva (o la vieja si falló)
        setMoving((m) => (m?.id === cardId && m.order === order ? null : m))
      }
      return
    }
    if (!over) return
    const overData = over.data.current as DragData

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
    }
  }

  // Dónde cae la tarjeta soltada: columna y order nuevos, o null si no cambia
  function cardDropTarget({ active, over }: DragEndEvent) {
    if (!over) return null
    const overData = over.data.current as DragData
    const card = cards.find((c) => c.id === active.id)
    if (!card || !overData) return null

    // `cardsByColumn` ya tiene la tarjeta en la columna sobre la que se soltó
    const destColumnId = overData.columnId
    const destCards = cardsByColumn.get(destColumnId) ?? []
    let overIndex = destCards.length // sobre la columna: al final
    if (overData.type === 'card') {
      overIndex = destCards.findIndex((c) => c.id === over.id)
      if (overIndex < 0) overIndex = destCards.length
    }

    const order = dropOrder(
      destCards,
      card.id,
      overIndex,
      viewBlockOf(card, revealed, currentUid),
    )
    if (card.columnId === destColumnId && Math.abs(card.order - order) < 0.0001) {
      return null
    }
    return { cardId: card.id, columnId: destColumnId, order }
  }

  const activeCard = activeCardId
    ? viewCards.find((c) => c.id === activeCardId)
    : undefined
  const activeColumn = activeCard
    ? columns.find((c) => c.id === activeCard.columnId)
    : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col md:h-full">
        {cardsError && (
          <Banner tone="red" className="mb-4">
            <strong>Error cargando tarjetas:</strong> {cardsError}
          </Banner>
        )}
        {sortedColumns.length > 1 && (
          <nav
            aria-label="Columnas"
            className="sm:hidden flex gap-1.5 overflow-x-auto -mx-page px-page pb-3 [scrollbar-width:none]"
          >
            {sortedColumns.map((col) => {
              const colors = getColor(col.color ?? 'slate')
              const active = col.id === activeColId
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => jumpToColumn(col.id)}
                  aria-current={active || undefined}
                  className={cx(
                    'flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-meta font-semibold border transition',
                    active
                      ? cx(colors.badge, 'border-transparent')
                      : 'bg-surface border-line text-ink-muted',
                  )}
                >
                  <span className={cx('w-2 h-2 rounded-full', colors.dot)} aria-hidden />
                  <span className="max-w-[9rem] truncate">{col.title}</span>
                  <span className="tabular-nums opacity-70">
                    {cardsByColumn.get(col.id)?.length ?? 0}
                  </span>
                </button>
              )
            })}
          </nav>
        )}
        {/* Desde md el tablero tiene alto fijo y scrollea adentro: filtrar no
            cambia el alto de la página ni mueve el header o los participantes.
            Grid de una fila de al menos todo el alto: las columnas se estiran
            juntas hasta la más larga y reparten el ancho disponible. */}
        <div
          ref={scrollerRef}
          onScroll={handleBoardScroll}
          className="md:flex-1 md:min-h-0 grid grid-flow-col auto-cols-[85vw] sm:auto-cols-[minmax(14rem,1fr)] gap-3 lg:gap-4 overflow-x-auto md:overflow-auto pb-4 -mx-page px-page sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-px-page sm:snap-none"
        >
          <SortableContext
            items={sortedColumns.map((c) => `column:${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedColumns.map((col, colIdx) => {
              const isActionables = col.id === actionablesId
              return (
                <Fragment key={col.id}>
                  <ColumnView
                    column={col}
                    columns={columns}
                    cards={cardsByColumn.get(col.id) ?? []}
                    maxOrder={maxOrderByColumn.get(col.id) ?? null}
                    totalCount={liveCountByColumn.get(col.id) ?? 0}
                    roomId={roomId}
                    currentUid={currentUid}
                    currentName={currentName}
                    nameOf={nameOf}
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
                    shareCards={isActionables ? shareCards : undefined}
                    // Accionables no se filtra en la presentación: nada que animar
                    motion={presenting && isActionables ? null : motion}
                    columnIndex={colIdx}
                    dropTarget={
                      !!activeCard &&
                      activeCard.columnId === col.id &&
                      dragOrigin !== col.id
                    }
                  />
                </Fragment>
              )
            })}
          </SortableContext>
        </div>
      </div>
      {/* En el body: así la tarjeta flota por encima de todo y no la recorta
          el scroll del tablero al pasar de una columna a otra */}
      {createPortal(
        <DragOverlay
          dropAnimation={prefersReducedMotion() ? null : DROP_ANIMATION}
          zIndex={60}
        >
          {activeCard ? (
            <CardDragPreview
              card={activeCard}
              colorKey={activeColumn?.color ?? 'slate'}
              roomId={roomId}
              currentUid={currentUid}
              nameOf={nameOf}
              showReactions={revealed}
              vote={
                activeCard.columnId === actionablesId
                  ? undefined
                  : cardVoteProps(voting, activeCard.id)
              }
              copied={copiedIds.has(activeCard.id)}
            />
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
