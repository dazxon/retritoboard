import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../lib/types'
import { deleteCard, updateCardContent } from '../lib/cards'

type Props = {
  card: Card & { id: string }
  roomId: string
  canEdit: boolean
}

export function CardView({ card, roomId, canEdit }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: !canEdit || editing,
      data: { type: 'card', columnId: card.columnId },
    })

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(card.content)
  }, [card.content, editing])

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  async function save() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(card.content)
      setEditing(false)
      return
    }
    if (trimmed !== card.content) {
      try {
        await updateCardContent({ roomId, cardId: card.id, content: trimmed })
      } catch (e) {
        console.error('updateCard failed', e)
      }
    }
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('¿Borrar esta tarjeta?')) return
    try {
      await deleteCard({ roomId, cardId: card.id })
    } catch (e) {
      console.error('deleteCard failed', e)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editing ? {} : listeners)}
      className={`group relative bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm ${
        canEdit && !editing ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              save()
            }
            if (e.key === 'Escape') {
              setDraft(card.content)
              setEditing(false)
            }
          }}
          rows={Math.max(2, draft.split('\n').length)}
          className="w-full text-sm bg-transparent text-slate-900 dark:text-slate-100 resize-none focus:outline-none"
        />
      ) : (
        <p
          className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words"
          onDoubleClick={() => canEdit && setEditing(true)}
        >
          {card.content}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{card.authorName}</span>
        {canEdit && !editing && (
          <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950"
              aria-label="Borrar"
            >
              🗑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
