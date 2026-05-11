import { useState, type KeyboardEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Column } from '../lib/types'
import { CardView } from './CardView'
import { ColorPicker } from './ColorPicker'
import { createCard, nextOrder } from '../lib/cards'
import { deleteColumn, renameColumn, setColumnColor } from '../lib/columns'
import { getColor, type ColorKey } from '../lib/colors'

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

  const colorKey: ColorKey = column.color ?? 'slate'
  const colors = getColor(colorKey)

  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id },
  })

  const cardIds = cards.map((c) => c.id)

  async function handleAdd() {
    const text = adding.trim()
    if (!text) return
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
      })
      setAdding('')
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

  return (
    <div
      ref={setNodeRef}
      className={`relative flex-shrink-0 w-72 ${colors.bg} rounded-xl pt-1 pb-3 px-3 flex flex-col gap-3 transition ${
        isOver ? 'ring-2 ring-violet-400 ring-offset-1' : ''
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${colors.accent} rounded-t-xl`}
        aria-hidden
      />

      <header className="flex items-center gap-2 pt-2.5 px-1">
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
          <button
            type="button"
            onClick={handleDeleteColumn}
            className="text-xs text-slate-400 hover:text-red-500 px-1"
            aria-label="Borrar columna"
            title="Borrar columna"
          >
            ✕
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col gap-2 min-h-[40px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => {
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
              />
            )
          })}
        </SortableContext>
      </div>

      <div className="mt-1">
        <textarea
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={onAddKey}
          placeholder="+ Agregar tarjeta"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
        {adding.trim() && (
          <button
            type="button"
            onClick={handleAdd}
            className="mt-1 w-full px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition"
          >
            Agregar
          </button>
        )}
      </div>
    </div>
  )
}
