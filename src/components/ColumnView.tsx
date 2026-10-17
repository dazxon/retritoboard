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
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { FIELD_BASE } from './ui/field'
import { cx } from './ui/cx'
import type { BoardVoting } from '../lib/voting'

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
    if (!text && !selectedGif) return
    try {
      await createCard({
        roomId,
        columnId: column.id,
        authorUid: currentUid,
        authorName: currentName,
        content: text,
        order: nextOrder(maxOrder),
        mediaUrl: selectedGif?.embedUrl,
        mediaType: selectedGif ? 'gif' : undefined,
      })
      setAdding('')
      setSelectedGif(null)
    } catch (e) {
      console.error('createCard failed', e)
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex-1 min-w-[85vw] sm:min-w-56 max-w-[26rem] snap-start ${colors.bg} rounded-card pt-1 pb-3 px-3 flex flex-col gap-3 transition ${
        isOver && !isDragging ? 'ring-2 ring-primary-400 ring-offset-1' : ''
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${colors.accent} rounded-t-card`}
        aria-hidden
      />

      <header className="flex items-center gap-2 pt-2.5 px-1">
        {isAdmin && !isActionables && (
          <IconButton
            label="Reordenar columna"
            title="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-0.5 -ml-0.5 text-base select-none"
          >
            ⋮⋮
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
            className={cx(FIELD_BASE, 'flex-1 min-w-0 px-2 py-1 text-base font-bold bg-white dark:bg-slate-800', colors.text)}
          />
        ) : (
          <h3
            className={`flex-1 text-base font-bold tracking-tight ${colors.text} truncate ${
              isAdmin ? 'cursor-text' : ''
            }`}
            onClick={() => isAdmin && setEditingTitle(true)}
            title={isAdmin ? 'Click para renombrar' : ''}
          >
            {column.title}
          </h3>
        )}
        <span
          className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${colors.badge}`}
        >
          {cards.length}
        </span>
        {photoCards && !editingTitle && (
          <Button
            variant="primary"
            size="xs"
            onClick={() => setShowPhoto(true)}
            aria-label="Ver accionables en grande para sacar una foto"
            title="Ver en grande para la foto"
          >
            📸 Foto
          </Button>
        )}
        {isAdmin && !isActionables && !editingTitle && (
          <IconButton
            label="Borrar columna"
            onClick={handleDeleteColumn}
            className="text-xs text-slate-400 hover:text-red-500 px-1 py-1"
          >
            ✕
          </IconButton>
        )}
      </header>

      {/* Input arriba, pegado al header: las tarjetas que llegan se suman
          debajo y nunca empujan lo que estas escribiendo. */}
      <div className="relative">
        <textarea
          ref={addingRef}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={onAddKey}
          placeholder="+ Agregar tarjeta"
          rows={2}
          className={cx(FIELD_BASE, 'block w-full px-3 py-2 text-sm bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 resize-none overflow-hidden')}
        />

        {selectedGif && (
          <div className="mt-1 relative inline-block">
            <img
              src={selectedGif.previewUrl}
              alt={selectedGif.title}
              className="max-h-24 rounded border border-slate-200 dark:border-slate-700"
              draggable={false}
            />
            <IconButton
              label="Quitar GIF"
              onClick={() => setSelectedGif(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] hover:bg-red-600"
            >
              ✕
            </IconButton>
          </div>
        )}

        <div className="mt-1 flex gap-1">
          {(adding.trim() || selectedGif) && (
            <Button variant="primary" size="sm" onClick={handleAdd} className="flex-1">
              Agregar
            </Button>
          )}
          {GIPHY_ENABLED && (
            <Button
              ref={gifAnchorRef}
              size="sm"
              pressed={showGiphy}
              onClick={() => setShowGiphy((v) => !v)}
              title="Buscar GIF"
              aria-label="Buscar GIF"
            >
              🖼️ GIF
            </Button>
          )}
        </div>

        {showGiphy && (
          <GiphyPicker
            anchorRef={gifAnchorRef}
            onSelect={(g) => setSelectedGif(g)}
            onClose={() => setShowGiphy(false)}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-[40px]">
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
