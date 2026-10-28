import { useRef, useState, type RefObject, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { EmojiPicker as Picker, type SkinTone } from 'frimousse'
import { Search } from 'lucide-react'
import { getRecentEmojis, isSameEmoji, quickEmojis } from '../lib/reactions'
import { useAnchoredPosition } from '../lib/useAnchoredPosition'
import { useDismiss } from '../lib/useDismiss'
import { FIELD_BASE } from './ui/field'
import { cx } from './ui/cx'
import { POPOVER } from './ui/surface'
import { Spinner } from './ui/Spinner'

// Picker completo de emojis para reaccionar. Se carga con lazy() desde
// ReactionBar: frimousse y los datos (emojibase en español, servidos con el
// sitio, ver vite.config.ts) solo se bajan la primera vez que alguien lo abre.

type Props = {
  // Botón "+": se posiciona contra él y tocarlo no cuenta como "afuera"
  anchorRef: RefObject<HTMLElement | null>
  // Emojis con los que ya reaccioné en esta tarjeta (elegirlos de nuevo los saca)
  mine: string[]
  onSelect: (emoji: string) => void
  onClose: () => void
}

const COLUMNS = 8
const MAX_WIDTH = 320
const HEIGHT = 380
const SKIN_KEY = 'retritoboard:skin-tone'
const SKIN_TONES: SkinTone[] = ['none', 'light', 'medium-light', 'medium', 'medium-dark', 'dark']

const EMOJI_BUTTON =
  'size-9 inline-flex items-center justify-center rounded-control text-xl leading-none transition-colors'

function readSkinTone(): SkinTone {
  try {
    const v = localStorage.getItem(SKIN_KEY) as SkinTone | null
    return v && SKIN_TONES.includes(v) ? v : 'none'
  } catch {
    return 'none'
  }
}

// En touch el teclado taparía el picker: el foco va a la búsqueda solo con mouse
const finePointer = () => window.matchMedia?.('(pointer: fine)').matches ?? true

// Que tocar o scrollear el picker no arranque el drag de la tarjeta de abajo
// (los eventos de React suben por el portal hasta el sortable).
const stop = (e: SyntheticEvent) => e.stopPropagation()

export default function EmojiPicker({ anchorRef, mine, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [skinTone, setSkinTone] = useState<SkinTone>(readSkinTone)
  const [quick] = useState(() => quickEmojis(getRecentEmojis()))
  const width = Math.min(MAX_WIDTH, window.innerWidth - 16)
  const pos = useAnchoredPosition(anchorRef, width, HEIGHT)

  useDismiss([ref, anchorRef], onClose)

  const isMine = (emoji: string) => mine.some((m) => isSameEmoji(m, emoji))

  function changeSkinTone(next: SkinTone) {
    setSkinTone(next)
    try {
      localStorage.setItem(SKIN_KEY, next)
    } catch {
      // Sin localStorage el tono dura hasta cerrar el picker
    }
  }

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      className={cx(POPOVER, 'fixed z-50 p-3 flex flex-col')}
      style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width, height: HEIGHT }}
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onKeyDown={(e) => {
        stop(e)
        if (e.key === 'Escape') onClose()
      }}
      role="dialog"
      aria-label="Elegir reacción"
    >
      <Picker.Root
        locale="es"
        emojibaseUrl={`${import.meta.env.BASE_URL}emojibase`}
        columns={COLUMNS}
        skinTone={skinTone}
        onEmojiSelect={({ emoji }) => onSelect(emoji)}
        className="flex flex-col flex-1 min-h-0 isolate"
      >
        <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-subtle pointer-events-none"
              aria-hidden
            />
            <Picker.Search
              placeholder="Buscar emoji…"
              autoFocus={finePointer()}
              aria-label="Buscar emoji"
              className={cx(FIELD_BASE, 'w-full h-9 pl-8 pr-3 text-sm bg-surface-muted text-ink')}
            />
          </div>
          <Picker.SkinTone>
            {({ skinToneVariations }) => {
              const i = SKIN_TONES.indexOf(skinTone)
              const current = skinToneVariations.find((v) => v.skinTone === skinTone)
              return (
                <button
                  type="button"
                  onClick={() => changeSkinTone(SKIN_TONES[(i + 1) % SKIN_TONES.length])}
                  className={cx(EMOJI_BUTTON, 'hover:bg-surface-muted flex-shrink-0')}
                  aria-label="Cambiar tono de piel"
                  title="Cambiar tono de piel"
                >
                  {current?.emoji ?? '✋'}
                </button>
              )
            }}
          </Picker.SkinTone>
        </div>

        <div className="flex-shrink-0 mb-1.5" role="group" aria-label="Rápidos">
          <div className="grid grid-cols-8">
            {quick.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelect(emoji)}
                className={cx(
                  EMOJI_BUTTON,
                  'hover:bg-surface-muted active:scale-90',
                  isMine(emoji) && 'bg-primary-100 dark:bg-primary-900/50',
                )}
                aria-pressed={isMine(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mt-1.5 border-t border-line" />
        </div>

        <Picker.Viewport className="relative flex-1 min-h-0 outline-none -mx-1 px-1">
          <Picker.Loading className="absolute inset-0 flex items-center justify-center gap-2 text-meta text-ink-subtle">
            <Spinner />
            Cargando emojis…
          </Picker.Loading>
          <Picker.Empty className="absolute inset-0 flex items-center justify-center text-meta text-ink-subtle text-center px-4">
            {({ search }) => <>Ningún emoji para “{search}”. Probá con otra palabra.</>}
          </Picker.Empty>
          <Picker.List
            className="select-none pb-1"
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div {...props} className="eyebrow bg-surface pt-2 pb-1 px-0.5 text-ink-subtle">
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div {...props} className="grid grid-cols-8">
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <button
                  {...props}
                  title={emoji.label}
                  className={cx(
                    EMOJI_BUTTON,
                    isMine(emoji.emoji)
                      ? 'bg-primary-100 dark:bg-primary-900/50'
                      : emoji.isActive && 'bg-surface-muted',
                  )}
                >
                  {emoji.emoji}
                </button>
              ),
            }}
          />
        </Picker.Viewport>
      </Picker.Root>
    </div>,
    document.body,
  )
}
