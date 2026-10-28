import { useRef, useState, type KeyboardEvent } from 'react'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card, Column } from '../lib/types'
import { CardView } from './CardView'
import { ColorPicker } from './ColorPicker'
import { GiphyPicker } from './GiphyPicker'
import { ActionablesPhoto } from './ActionablesPhoto'
import { createCard } from '../lib/cards'
import { nextOrder } from '../lib/order'
import { deleteColumn, renameColumn, setColumnColor } from '../lib/columns'
import { getColor, type ColorKey } from '../lib/colors'
import { GIPHY_ENABLED, type GiphyGif } from '../lib/giphy'
import { useAutosizeTextarea } from '../lib/useAutosizeTextarea'
import { Camera, GripVertical, ImagePlay, Trash2, X } from 'lucide-react'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { FIELD_BASE } from './ui/field'
import { cx } from './ui/cx'
import type { BoardVoting } from '../lib/voting'
import type { CardMotion } from '../lib/cardMotion'

type Props = {
  column: Column
  columns: Column[]
  cards: (Card & { id: string })[]
  // Max order de la columna sin filtros (lo calcula Board)
  maxOrder: number | null
  roomId: string
  currentUid: string
  currentName: string
  isAdmin: boolean
  revealed: boolean
  isActionables: boolean
  voting: BoardVoting | null
  copiedIds: Set<string>
  onCopyToActionables?: (card: Card & { id: string }) => void
  // Solo en accionables: todas las visibles, sin filtros (vista para la foto)
  photoCards?: (Card & { id: string })[]
  // Transición de las tarjetas al filtrar por persona
  motion?: CardMotion | null
}

export function ColumnView({
  column,
  columns,
  cards,
  maxOrder,
  roomId,
  currentUid,
  currentName,
  isAdmin,
  revealed,
  isActionables,
  voting,
  copiedIds,
  onCopyToActionables,
  photoCards,
  motion = null,
}: Props) {
  const [adding, setAdding] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)
  const [selectedGif, setSelectedGif] = useState<GiphyGif | null>(null)
  const [showGiphy, setShowGiphy] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  const gifAnchorRef = useRef<HTMLButtonElement>(null)
  const addingRef = useRef<HTMLTextAreaElement>(null)

  useAutosizeTextarea(addingRef, adding, 320)

  const colorKey: ColorKey = column.color ?? 'slate'
  const colors = getColor(colorKey)


  const {
    setNodeRef,
    isOver,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column:${column.id}`,
    data: { type: 'column', columnId: column.id },
    disabled: !isAdmin || isActionables,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const cardIds = cards.map((c) => c.id)

  async function handleAdd() {
    const text = adding.trim()
    const gif = selectedGif
    if (!text && !gif) return
    // Se limpia antes de esperar a Firestore: si no, lo que tipeás apenas
    // después del Enter se borraba al confirmar, y un doble Enter duplicaba
    setAdding('')
    setSelectedGif(null)
    try {
      await createCard({
        roomId,
        columnId: column.id,
        authorUid: currentUid,
        authorName: currentName,
        content: text,
        order: nextOrder(maxOrder),
        mediaUrl: gif?.embedUrl,
        mediaType: gif ? 'gif' : undefined,
      })
    } catch (e) {
      console.error('createCard failed', e)
      // Devolver el texto para no perderlo, salvo que ya estés escribiendo otra
      setAdding((cur) => cur || text)
      setSelectedGif((cur) => cur ?? gif)
    }
  }

  function onAddKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === column.title) {
      setTitleDraft(column.title)
      return
    }
    try {
      await renameColumn(roomId, columns, column.id, trimmed)
    } catch (e) {
      console.error('renameColumn failed', e)
      setTitleDraft(column.title)
    }
  }

  async function handleDeleteColumn() {
    const count = cards.length
    const msg = count
      ? `¿Borrar "${column.title}" y sus ${count} tarjeta${count === 1 ? '' : 's'}?`
      : `¿Borrar "${column.title}"?`
    if (!confirm(msg)) return
    try {
      await deleteColumn(roomId, columns, column.id)
    } catch (e) {
      console.error('deleteColumn failed', e)
    }
  }

  async function handleColorChange(c: ColorKey) {
    try {
      await setColumnColor(roomId, columns, column.id, c)
    } catch (e) {
      console.error('setColumnColor failed', e)
    }
  }

  const canAdd = !!adding.trim() || !!selectedGif

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-column-id={column.id}
      className={cx(
        // Ancho y alto los pone el grid del tablero (Board): todas las
        // columnas miden lo mismo y al filtrar no cambian de tamaño
        'group/col relative min-w-0 max-md:min-h-[60dvh] snap-start rounded-card border p-panel flex flex-col gap-3 transition-shadow',
        colors.bg,
        colors.border,
        isOver && !isDragging && 'ring-2 ring-primary-400 ring-offset-2 ring-offset-canvas',
      )}
    >
      <header className="flex items-center gap-2 min-h-8 pl-1">
        {isAdmin && !isActionables && (
          <IconButton
            label="Reordenar columna"
            title="Arrastrar para reordenar"
            size="xs"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing -ml-1.5 -mr-1 select-none"
          >
            <GripVertical />
          </IconButton>
        )}
        <ColorPicker
          value={colorKey}
          onChange={handleColorChange}
          disabled={!isAdmin}
        />
        {editingTitle ? (
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle()
              if (e.key === 'Escape') {
                setTitleDraft(column.title)
                setEditingTitle(false)
              }
            }}
            autoFocus
            aria-label="Nombre de la columna"
            className={cx(FIELD_BASE, 'flex-1 min-w-0 h-8 px-2 font-display text-heading font-bold bg-surface', colors.text)}
          />
        ) : (
          <h3
            className={cx(
              'flex-1 min-w-0 font-display text-heading font-bold break-words',
              colors.text,
              isAdmin && 'cursor-text',
            )}
            onClick={() => isAdmin && setEditingTitle(true)}
            title={isAdmin ? 'Click para renombrar' : ''}
          >
            {column.title}
          </h3>
        )}
        <span
          className={cx('min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-full text-meta font-semibold tabular-nums', colors.badge)}
        >
          {cards.length}
        </span>
        {photoCards && !editingTitle && (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setShowPhoto(true)}
            aria-label="Ver accionables en grande para sacar una foto"
            title="Ver en grande para la foto"
          >
            <Camera />
            <span className="hidden lg:inline">Foto</span>
          </Button>
        )}
        {isAdmin && !isActionables && !editingTitle && (
          <IconButton
            label="Borrar columna"
            variant="danger"
            size="xs"
            onClick={handleDeleteColumn}
            className="pointer-fine:opacity-0 pointer-fine:group-hover/col:opacity-100 focus-visible:opacity-100 -mr-1"
          >
            <Trash2 />
          </IconButton>
        )}
      </header>

      {/* Input arriba, pegado al header: las tarjetas que llegan se suman
          debajo y nunca empujan lo que estas escribiendo. Texto, GIF y
          Agregar van en una sola caja (como un composer de chat). */}
      <div className="group/composer rounded-control border border-line bg-surface shadow-card transition-[border-color,box-shadow] focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/15 dark:focus-within:border-primary-400 dark:focus-within:ring-primary-400/20">
        <textarea
          ref={addingRef}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={onAddKey}
          placeholder="Escribí una tarjeta…"
          aria-label={`Nueva tarjeta en ${column.title}`}
          rows={2}
          className="block w-full px-3 pt-2.5 pb-1 text-body bg-transparent text-ink placeholder:text-ink-subtle resize-none overflow-hidden focus:outline-none"
        />

        {selectedGif && (
          <div className="mx-3 mt-1 mb-1 relative inline-block">
            <img
              src={selectedGif.previewUrl}
              alt={selectedGif.title}
              className="max-h-24 rounded-md border border-line"
              draggable={false}
            />
            <IconButton
              label="Quitar GIF"
              size="xs"
              onClick={() => setSelectedGif(null)}
              className="absolute -top-2 -right-2 rounded-full bg-ink text-surface hover:bg-red-600 hover:text-white shadow-raised"
            >
              <X />
            </IconButton>
          </div>
        )}

        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          {GIPHY_ENABLED && (
            <Button
              ref={gifAnchorRef}
              size="xs"
              variant="ghost"
              pressed={showGiphy}
              onClick={() => setShowGiphy((v) => !v)}
              title="Buscar GIF"
              aria-label="Buscar GIF"
              className="px-2"
            >
              <ImagePlay />
              GIF
            </Button>
          )}
          <span className="hidden pointer-fine:inline flex-1 min-w-0 truncate px-1 text-meta text-ink-subtle opacity-0 group-focus-within/composer:opacity-100 transition-opacity">
            Enter para agregar
          </span>
          <Button
            variant="primary"
            size="xs"
            onClick={handleAdd}
            disabled={!canAdd}
            className="ml-auto"
          >
            Agregar
          </Button>
        </div>

        {showGiphy && (
          <GiphyPicker
            anchorRef={gifAnchorRef}
            onSelect={(g) => setSelectedGif(g)}
            onClose={() => setShowGiphy(false)}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-10">
        {cards.length === 0 && (
          <p
            className={cx(
              'py-6 px-4 text-center text-meta text-ink-subtle',
              motion?.phase === 'in' && 'animate-pop-in',
            )}
          >
            {isActionables
              ? 'Copiá tarjetas con 🎯 o escribí los accionables acá.'
              : 'Sin tarjetas para mostrar.'}
          </p>
        )}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card, idx) => {
            const isOwn = card.authorUid === currentUid
            const canEdit = isOwn || isAdmin
            const hidden = !revealed && !isOwn
            return (
              <CardView
                key={card.id}
                card={card}
                roomId={roomId}
                canEdit={canEdit}
                hidden={hidden}
                colorKey={colorKey}
                revealOrder={idx}
                currentUid={currentUid}
                currentName={currentName}
                showReactions={revealed}
                motion={motion}
                motionIndex={idx}
                vote={
                  voting
                    ? {
                        state: voting.state,
                        mine: voting.myByCard[card.id] ?? 0,
                        total: voting.totals?.get(card.id) ?? 0,
                        maxPerCard: voting.maxPerCard,
                        canAdd:
                          voting.left > 0 &&
                          (voting.myByCard[card.id] ?? 0) < voting.maxPerCard,
                        onVote: (delta) => voting.onVote(card.id, delta),
                      }
                    : undefined
                }
                copied={copiedIds.has(card.id)}
                onCopyToActionables={
                  onCopyToActionables
                    ? () => onCopyToActionables(card)
                    : undefined
                }
              />
            )
          })}
        </SortableContext>
      </div>

      {showPhoto && photoCards && (
        <ActionablesPhoto
          title={column.title}
          colorKey={colorKey}
          cards={photoCards}
          onClose={() => setShowPhoto(false)}
        />
      )}
    </div>
  )
}
