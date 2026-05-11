import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../lib/types'
import { deleteCard, updateCardContent } from '../lib/cards'
import { getColor, type ColorKey } from '../lib/colors'

type Props = {
  card: Card & { id: string }
  roomId: string
  canEdit: boolean
  hidden: boolean
  colorKey: ColorKey
}

export function CardView({ card, roomId, canEdit, hidden, colorKey }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const colors = getColor(colorKey)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: !canEdit || editing || hidden,
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

  const initial = (card.authorName || '?').charAt(0).toUpperCase()

  if (hidden) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative bg-slate-200/40 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 pl-4 pr-3 py-3"
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colors.stripe} opacity-40`}
          aria-hidden
        />
        <div className="flex items-center justify-center gap-2 py-2 text-slate-400 dark:text-slate-500">
          <span className="text-lg">🔒</span>
          <span className="text-[10px] uppercase tracking-wide font-semibold">
            Oculta
          </span>
        </div>
        <footer className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <span
              className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-semibold text-white ${colors.accent} flex-shrink-0 opacity-70`}
              aria-hidden
            >
              {initial}
            </span>
            <span className="truncate">{card.authorName}</span>
          </span>
        </footer>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editing ? {} : listeners)}
      className={`group relative bg-white dark:bg-slate-800 rounded-xl pl-4 pr-3 py-3 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition ${
        canEdit && !editing ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colors.stripe}`}
        aria-hidden
      />

      {card.mediaUrl && !editing && (
        <img
          src={card.mediaUrl}
          alt=""
          className="w-full max-h-48 object-contain rounded mb-2 bg-slate-50 dark:bg-slate-900"
          loading="lazy"
          draggable={false}
        />
      )}

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
          className="w-full text-sm leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 resize-none focus:outline-none"
        />
      ) : card.content ? (
        <p
          className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words"
          onDoubleClick={() => canEdit && setEditing(true)}
        >
          {card.content}
        </p>
      ) : null}

      <footer className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <span
            className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-semibold text-white ${colors.accent} flex-shrink-0`}
            aria-hidden
          >
            {initial}
          </span>
          <span className="truncate">{card.authorName}</span>
        </span>
        {canEdit && !editing && (
          <div className="opacity-0 group-hover:opacity-100 transition flex gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Editar"
              title="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded text-xs hover:bg-red-50 dark:hover:bg-red-950"
              aria-label="Borrar"
              title="Borrar"
            >
              🗑
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
