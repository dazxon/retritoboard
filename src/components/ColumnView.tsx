import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
import { createCard, nextOrder } from '../lib/cards'
import {
  deleteColumn,
  renameColumn,
  setColumnActionables,
  setColumnColor,
} from '../lib/columns'
import { getColor, type ColorKey } from '../lib/colors'
import { GIPHY_ENABLED, type GiphyGif } from '../lib/giphy'

type Props = {
  column: Column
  columns: Column[]
  cards: (Card & { id: string })[]
  roomId: string
  currentUid: string
  currentName: string
  isAdmin: boolean
  revealed: boolean
}

export function ColumnView({
  column,
  columns,
  cards,
  roomId,
  currentUid,
  currentName,
  isAdmin,
  revealed,
}: Props) {
  const [adding, setAdding] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)
  const [selectedGif, setSelectedGif] = useState<GiphyGif | null>(null)
  const [showGiphy, setShowGiphy] = useState(false)
  const gifAnchorRef = useRef<HTMLButtonElement>(null)
  const addingRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand del textarea segun contenido
  useEffect(() => {
    const el = addingRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [adding])

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
    disabled: !isAdmin,
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
    const maxOrder = cards.length
      ? Math.max(...cards.map((c) => c.order))
      : null
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
      ? `Borrar "${column.title}" y sus ${count} tarjeta${count === 1 ? '' : 's'}?`
      : `Borrar "${column.title}"?`
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

  async function handleToggleActionables() {
    try {
      await setColumnActionables(roomId, columns, column.id, !column.isActionables)
    } catch (e) {
      console.error('setColumnActionables failed', e)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative flex-shrink-0 w-72 ${colors.bg} rounded-xl pt-1 pb-3 px-3 flex flex-col gap-3 transition ${
        isOver && !isDragging ? 'ring-2 ring-violet-400 ring-offset-1' : ''
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${colors.accent} rounded-t-xl`}
        aria-hidden
      />

      <header className="flex items-center gap-2 pt-2.5 px-1">
        {isAdmin && (
          <button
            type="button"
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-0.5 -ml-0.5 text-base leading-none select-none"
            aria-label="Reordenar columna"
            title="Arrastrar para reordenar"
          >
            ⋮⋮
          </button>
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
            className={`flex-1 px-2 py-1 rounded bg-white dark:bg-slate-800 text-base font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 ${colors.text}`}
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
          className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${colors.badge}`}
        >
          {cards.length}
        </span>
        {isAdmin && !editingTitle && (
          <>
            <button
              type="button"
              onClick={handleToggleActionables}
              className={`text-xs px-1 rounded transition ${
                column.isActionables
                  ? 'text-violet-600 dark:text-violet-300'
                  : 'text-slate-300 dark:text-slate-600 hover:text-violet-500'
              }`}
              aria-label={
                column.isActionables
                  ? 'Quitar de accionables'
                  : 'Marcar como columna de accionables'
              }
              title={
                column.isActionables
                  ? 'Columna de accionables (click para quitar)'
                  : 'Marcar como accionables para el panel de Slack'
              }
            >
              🎯
            </button>
            <button
              type="button"
              onClick={handleDeleteColumn}
              className="text-xs text-slate-400 hover:text-red-500 px-1"
              aria-label="Borrar columna"
              title="Borrar columna"
            >
              ✕
            </button>
          </>
        )}
      </header>

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
              />
            )
          })}
        </SortableContext>
      </div>

      <div className="mt-1 relative">
        <textarea
          ref={addingRef}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={onAddKey}
          placeholder="+ Agregar tarjeta"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none overflow-hidden"
        />

        {selectedGif && (
          <div className="mt-1 relative inline-block">
            <img
              src={selectedGif.previewUrl}
              alt={selectedGif.title}
              className="max-h-24 rounded border border-slate-200 dark:border-slate-700"
              draggable={false}
            />
            <button
              type="button"
              onClick={() => setSelectedGif(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center hover:bg-red-600 transition"
              aria-label="Quitar GIF"
              title="Quitar GIF"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mt-1 flex gap-1">
          {(adding.trim() || selectedGif) && (
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition"
            >
              Agregar
            </button>
          )}
          {GIPHY_ENABLED && (
            <button
              ref={gifAnchorRef}
              type="button"
              onClick={() => setShowGiphy((v) => !v)}
              className={`px-2 py-1.5 rounded-lg border text-sm font-medium transition ${
                showGiphy
                  ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Buscar GIF"
              aria-label="Buscar GIF"
            >
              🖼️ GIF
            </button>
          )}
        </div>

        {showGiphy && (
          <GiphyPicker
            anchorEl={gifAnchorRef.current}
            onSelect={(g) => setSelectedGif(g)}
            onClose={() => setShowGiphy(false)}
          />
        )}
      </div>
    </div>
  )
}
