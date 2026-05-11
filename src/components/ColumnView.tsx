import { useState, type KeyboardEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Column } from '../lib/types'
import { CardView } from './CardView'
import { createCard, nextOrder } from '../lib/cards'
import { deleteColumn, renameColumn } from '../lib/columns'

type Props = {
  column: Column
  columns: Column[]
  cards: (Card & { id: string })[]
  roomId: string
  currentUid: string
  currentName: string
  isAdmin: boolean
}

export function ColumnView({
  column,
  columns,
  cards,
  roomId,
  currentUid,
  currentName,
  isAdmin,
}: Props) {
  const [adding, setAdding] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)

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

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 flex flex-col gap-3 transition ${
        isOver ? 'ring-2 ring-violet-400' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-1">
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
            className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        ) : (
          <h3
            className={`flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate ${
              isAdmin ? 'cursor-text' : ''
            }`}
            onClick={() => isAdmin && setEditingTitle(true)}
            title={isAdmin ? 'Click para renombrar' : ''}
          >
            {column.title}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {cards.length}
            </span>
          </h3>
        )}
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
            const canEdit = card.authorUid === currentUid || isAdmin
            return (
              <CardView
                key={card.id}
                card={card}
                roomId={roomId}
                canEdit={canEdit}
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
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
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
