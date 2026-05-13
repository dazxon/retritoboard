import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../lib/types'
import { deleteCard, updateCard } from '../lib/cards'
import { getColor, type ColorKey } from '../lib/colors'
import { GiphyPicker } from './GiphyPicker'
import { GIPHY_ENABLED, type GiphyGif } from '../lib/giphy'

type Props = {
  card: Card & { id: string }
  roomId: string
  canEdit: boolean
  hidden: boolean
  colorKey: ColorKey
  revealOrder?: number
}

export function CardView({
  card,
  roomId,
  canEdit,
  hidden,
  colorKey,
  revealOrder = 0,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.content)
  const [draftMediaUrl, setDraftMediaUrl] = useState<string | null>(
    card.mediaUrl ?? null,
  )
  const [showGiphy, setShowGiphy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gifBtnRef = useRef<HTMLButtonElement>(null)
  const wasHiddenRef = useRef(hidden)
  const [revealing, setRevealing] = useState(false)
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

  // Auto-expand del textarea al editar
  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }, [draft, editing])

  useEffect(() => {
    if (!editing) {
      setDraft(card.content)
      setDraftMediaUrl(card.mediaUrl ?? null)
    }
  }, [card.content, card.mediaUrl, editing])

  // Animacion al pasar de oculta a visible
  useEffect(() => {
    if (wasHiddenRef.current === hidden) return
    wasHiddenRef.current = hidden
    if (hidden) return
    setRevealing(true)
    const delay = Math.min(revealOrder * 60, 600)
    const t = setTimeout(() => setRevealing(false), delay + 700)
    return () => clearTimeout(t)
  }, [hidden, revealOrder])

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  if (revealing) {
    style.animationDelay = `${Math.min(revealOrder * 60, 600)}ms`
  }

  async function save() {
    const trimmed = draft.trim()
    // No permitir tarjeta vacia: hay que tener texto o gif
    if (!trimmed && !draftMediaUrl) {
      setDraft(card.content)
      setDraftMediaUrl(card.mediaUrl ?? null)
      setEditing(false)
      return
    }
    const contentChanged = trimmed !== card.content
    const mediaChanged = draftMediaUrl !== (card.mediaUrl ?? null)
    if (contentChanged || mediaChanged) {
      try {
        await updateCard({
          roomId,
          cardId: card.id,
          content: contentChanged ? trimmed : undefined,
          mediaUrl: mediaChanged ? draftMediaUrl : undefined,
        })
      } catch (e) {
        console.error('updateCard failed', e)
      }
    }
    setEditing(false)
  }

  function cancelEdit() {
    setDraft(card.content)
    setDraftMediaUrl(card.mediaUrl ?? null)
    setShowGiphy(false)
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
      } ${revealing ? 'animate-card-reveal' : ''}`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colors.stripe}`}
        aria-hidden
      />

      {!editing && card.mediaUrl && (
        <img
          src={card.mediaUrl}
          alt=""
          className="w-full max-h-48 object-contain rounded mb-2 bg-slate-50 dark:bg-slate-900"
          loading="lazy"
          draggable={false}
        />
      )}

      {editing ? (
        <>
          {draftMediaUrl && (
            <div className="relative mb-2 inline-block">
              <img
                src={draftMediaUrl}
                alt=""
                className="w-full max-h-48 object-contain rounded bg-slate-50 dark:bg-slate-900"
                draggable={false}
              />
              <button
                type="button"
                onClick={() => setDraftMediaUrl(null)}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center hover:bg-red-600 transition"
                aria-label="Quitar GIF"
                title="Quitar GIF"
              >
                ✕
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                save()
              }
              if (e.key === 'Escape') cancelEdit()
            }}
            rows={2}
            className="w-full text-sm leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 resize-none focus:outline-none overflow-hidden"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {GIPHY_ENABLED && (
              <button
                ref={gifBtnRef}
                type="button"
                onClick={() => setShowGiphy((v) => !v)}
                onPointerDown={(e) => e.stopPropagation()}
                className={`px-2 py-1 rounded-lg border text-xs font-medium transition ${
                  showGiphy
                    ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={draftMediaUrl ? 'Cambiar GIF' : 'Agregar GIF'}
              >
                🖼️ {draftMediaUrl ? 'Cambiar GIF' : 'GIF'}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={cancelEdit}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium"
            >
              Guardar
            </button>
          </div>
          {showGiphy && (
            <GiphyPicker
              anchorEl={gifBtnRef.current}
              onSelect={(g: GiphyGif) => setDraftMediaUrl(g.embedUrl)}
              onClose={() => setShowGiphy(false)}
            />
          )}
        </>
      ) : card.content ? (
        <p
          className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words"
          onDoubleClick={() => canEdit && setEditing(true)}
        >
          {card.content}
        </p>
      ) : null}

      {!editing && (
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
          {canEdit && (
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
      )}
    </div>
  )
}
