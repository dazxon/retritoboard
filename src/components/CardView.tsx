import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../lib/types'
import { deleteCard, updateCard } from '../lib/cards'
import { getColor, type ColorKey } from '../lib/colors'
import { GiphyPicker } from './GiphyPicker'
import { ReactionBar } from './ReactionBar'
import { GIPHY_ENABLED, type GiphyGif } from '../lib/giphy'
import { useAutosizeTextarea } from '../lib/useAutosizeTextarea'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { cx } from './ui/cx'
import { CardVotes } from './CardVotes'
import { Check, ImagePlay, Lock, Pencil, Target, Trash2, X } from 'lucide-react'

type Props = {
  card: Card & { id: string }
  roomId: string
  canEdit: boolean
  hidden: boolean
  colorKey: ColorKey
  revealOrder?: number
  currentUid: string
  currentName: string
  // Solo mientras hay votacion (y nunca en accionables)
  vote?: ComponentProps<typeof CardVotes>
  // Ya tiene una copia en accionables
  copied?: boolean
  // Solo en columnas que no son accionables
  onCopyToActionables?: () => void
  // Las reacciones aparecen recién con la sala revelada
  showReactions?: boolean
}

export function CardView({
  card,
  roomId,
  canEdit,
  hidden,
  colorKey,
  revealOrder = 0,
  currentUid,
  currentName,
  vote,
  copied = false,
  onCopyToActionables,
  showReactions = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.content)
  const [draftMediaUrl, setDraftMediaUrl] = useState<string | null>(
    card.mediaUrl ?? null,
  )
  const [showGiphy, setShowGiphy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gifBtnRef = useRef<HTMLButtonElement>(null)
  const colors = getColor(colorKey)

  // Animacion al pasar de oculta a visible. Se ajusta el estado durante el
  // render al detectar el cambio (patron recomendado por React en vez de un
  // efecto que hace setState).
  const [prevHidden, setPrevHidden] = useState(hidden)
  const [revealing, setRevealing] = useState(false)
  if (prevHidden !== hidden) {
    setPrevHidden(hidden)
    setRevealing(!hidden)
  }
  const revealDelay = Math.min(revealOrder * 60, 600)
  useEffect(() => {
    if (!revealing) return
    const t = setTimeout(() => setRevealing(false), revealDelay + 700)
    return () => clearTimeout(t)
  }, [revealing, revealDelay])

  const dragDisabled = !canEdit || editing || hidden
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: dragDisabled,
      data: { type: 'card', columnId: card.columnId },
    })

  // Al entrar a editar: foco con el cursor al final (no seleccionar todo, que
  // con una tecla borraba el contenido entero)
  useEffect(() => {
    const el = textareaRef.current
    if (!editing || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  useAutosizeTextarea(textareaRef, editing ? draft : '', 480)

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  if (revealing) style.animationDelay = `${revealDelay}ms`

  function startEdit() {
    if (!canEdit) return
    // El draft arranca siempre de lo ultimo que llego de Firestore
    setDraft(card.content)
    setDraftMediaUrl(card.mediaUrl ?? null)
    setEditing(true)
  }

  async function save() {
    const trimmed = draft.trim()
    // No permitir tarjeta vacia: hay que tener texto o gif
    if (!trimmed && !draftMediaUrl) {
      cancelEdit()
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
    setShowGiphy(false)
    setEditing(false)
  }

  function cancelEdit() {
    setShowGiphy(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('¿Borrar esta tarjeta?')) return
    try {
      await deleteCard({
        roomId,
        cardId: card.id,
        deletedBy: currentUid,
        deletedByName: currentName,
      })
    } catch (e) {
      console.error('deleteCard failed', e)
    }
  }

  // Los botones dentro de la tarjeta no tienen que iniciar un drag
  const stopDrag = (e: PointerEvent) => e.stopPropagation()

  const stripe = (
    <div
      className={cx('absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full', colors.stripe, hidden && 'opacity-40')}
      aria-hidden
    />
  )

  if (hidden) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        // Una sola fila: con mucha gente escribiendo, la columna no se hace eterna
        className="relative flex items-center gap-2 bg-surface/50 rounded-card border border-dashed border-line-strong pl-card pr-3 py-2 text-meta text-ink-muted min-w-0"
      >
        {stripe}
        <Avatar name={card.authorName} className="opacity-60" />
        <span className="truncate">{card.authorName}</span>
        <span className="ml-auto flex items-center gap-1 flex-shrink-0 text-ink-subtle font-medium">
          <Lock className="size-3.5" aria-hidden />
          Oculta
        </span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Sin drag, sin atributos: si no, aria-disabled deja como deshabilitados
      // los botones de adentro (votar, reaccionar) para quien no es el autor
      {...(dragDisabled ? {} : attributes)}
      {...(dragDisabled ? {} : listeners)}
      className={cx(
        'group relative bg-surface rounded-card p-card border border-line shadow-card transition-[box-shadow,border-color]',
        editing
          ? 'ring-2 ring-primary-500 border-transparent'
          : 'hover:shadow-raised hover:border-line-strong',
        isDragging && 'shadow-raised',
        canEdit &&
          !editing &&
          // En touch se arrastra manteniendo apretado: sin seleccion de texto ni menu de iOS
          'cursor-grab active:cursor-grabbing pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]',
        revealing && 'animate-card-reveal',
      )}
    >
      {stripe}

      {!editing && card.mediaUrl && (
        <img
          src={card.mediaUrl}
          alt=""
          className="w-full max-h-48 object-contain rounded-md mb-2.5 bg-surface-muted"
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
                className="w-full max-h-48 object-contain rounded-md bg-surface-muted"
                draggable={false}
              />
              <IconButton
                label="Quitar GIF"
                size="xs"
                onClick={() => setDraftMediaUrl(null)}
                onPointerDown={stopDrag}
                className="absolute -top-2 -right-2 rounded-full bg-ink text-surface hover:bg-red-600 hover:text-white shadow-raised"
              >
                <X />
              </IconButton>
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
            aria-label="Editar tarjeta"
            className="w-full text-body bg-transparent text-ink resize-none focus:outline-none overflow-hidden"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {GIPHY_ENABLED && (
              <Button
                ref={gifBtnRef}
                size="xs"
                variant="ghost"
                pressed={showGiphy}
                onClick={() => setShowGiphy((v) => !v)}
                onPointerDown={stopDrag}
                title={draftMediaUrl ? 'Cambiar GIF' : 'Agregar GIF'}
                className="-ml-1 px-2"
              >
                <ImagePlay />
                {draftMediaUrl ? 'Cambiar GIF' : 'GIF'}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="xs" onClick={cancelEdit} onPointerDown={stopDrag}>
              Cancelar
            </Button>
            <Button variant="primary" size="xs" onClick={save} onPointerDown={stopDrag}>
              Guardar
            </Button>
          </div>
          {showGiphy && (
            <GiphyPicker
              anchorRef={gifBtnRef}
              onSelect={(g: GiphyGif) => setDraftMediaUrl(g.embedUrl)}
              onClose={() => setShowGiphy(false)}
            />
          )}
        </>
      ) : card.content ? (
        <p
          className="text-body text-ink whitespace-pre-wrap break-words"
          onDoubleClick={startEdit}
        >
          {card.content}
        </p>
      ) : null}

      {/* Reacciones a la izquierda y votos a la derecha, en la misma fila */}
      {!editing && (showReactions || vote) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 *:mt-0">
          {showReactions && (
            <ReactionBar
              roomId={roomId}
              cardId={card.id}
              reactions={card.reactions}
              currentUid={currentUid}
            />
          )}
          {vote && (
            <div className="ml-auto">
              <CardVotes {...vote} />
            </div>
          )}
        </div>
      )}

      {!editing && (
        <footer className="mt-2.5 -mb-1 flex items-center gap-1 min-h-7">
          <span className="flex items-center gap-1.5 text-meta text-ink-muted min-w-0 mr-auto">
            <Avatar name={card.authorName} />
            <span className="truncate">{card.authorName}</span>
          </span>
          {onCopyToActionables &&
            (copied ? (
              <span
                className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded-full text-meta font-medium bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-200 flex-shrink-0"
                title="Ya está en accionables"
                aria-label="Ya está en accionables"
              >
                <Target className="size-3.5" aria-hidden />
                <Check className="size-3.5" aria-hidden />
              </span>
            ) : (
              <IconButton
                label="Copiar a accionables"
                onClick={onCopyToActionables}
                onPointerDown={stopDrag}
                className="hover:text-primary-700 hover:bg-primary-50 dark:hover:text-primary-200 dark:hover:bg-primary-950/50 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
              >
                <Target />
              </IconButton>
            ))}
          {canEdit && (
            <div className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition flex flex-shrink-0">
              <IconButton label="Editar" onClick={startEdit} onPointerDown={stopDrag}>
                <Pencil />
              </IconButton>
              <IconButton
                label="Borrar"
                variant="danger"
                onClick={handleDelete}
                onPointerDown={stopDrag}
              >
                <Trash2 />
              </IconButton>
            </div>
          )}
        </footer>
      )}
    </div>
  )
}
