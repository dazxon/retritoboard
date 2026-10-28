import { lazy, Suspense, useRef, useState, type SyntheticEvent } from 'react'
import { SmilePlus } from 'lucide-react'
import { toggleReaction } from '../lib/cards'
import {
  describeReaction,
  groupReactions,
  planToggle,
  pushRecentEmoji,
  type LegacyReactions,
  type ReactionsBy,
} from '../lib/reactions'
import { cx } from './ui/cx'

const loadPicker = () => import('./EmojiPicker')
const EmojiPicker = lazy(loadPicker)

type Props = {
  roomId: string
  cardId: string
  reactionsBy: ReactionsBy | undefined
  legacy: LegacyReactions | undefined
  currentUid: string
  nameOf: (uid: string) => string | undefined
}

// Que tocar un chip no arranque el drag de la tarjeta (mouse y touch)
const stop = (e: SyntheticEvent) => e.stopPropagation()

// Reacciones estilo Slack al pie de la tarjeta: un chip por emoji con su
// contador, tocarlo suma o saca la tuya, y "+" abre el picker con todos los
// emojis. El "+" está siempre visible porque en iPad no hay hover.
export function ReactionBar({
  roomId,
  cardId,
  reactionsBy,
  legacy,
  currentUid,
  nameOf,
}: Props) {
  const [open, setOpen] = useState(false)
  const addRef = useRef<HTMLButtonElement>(null)
  const chips = groupReactions(reactionsBy, legacy)
  const mine = chips.filter((c) => c.uids.includes(currentUid)).map((c) => c.emoji)

  async function toggle(emoji: string) {
    const plan = planToggle(reactionsBy, legacy, emoji, currentUid)
    if (plan.add) pushRecentEmoji(emoji)
    try {
      await toggleReaction({ roomId, cardId, uid: currentUid, toggle: plan })
    } catch (e) {
      console.error('toggleReaction failed', e)
    }
  }

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1"
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
    >
      {chips.map((c) => {
        const isMine = c.uids.includes(currentUid)
        const who = describeReaction(c.emoji, c.uids, currentUid, nameOf)
        return (
          <button
            key={c.emoji}
            type="button"
            onClick={() => toggle(c.emoji)}
            className={cx(
              'h-7 pointer-coarse:h-8 px-2 inline-flex items-center gap-1 rounded-full border text-meta tabular-nums transition active:scale-95',
              isMine
                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-100'
                : 'bg-surface-muted border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
            aria-pressed={isMine}
            aria-label={`${who}. ${isMine ? 'Tocá para sacar la tuya' : 'Tocá para sumarte'}`}
            title={who}
          >
            <span className="text-sm leading-none">{c.emoji}</span>
            <span className="font-semibold">{c.uids.length}</span>
          </button>
        )
      })}

      <button
        ref={addRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onPointerEnter={loadPicker}
        className={cx(
          'h-7 w-8 pointer-coarse:h-8 pointer-coarse:w-9 inline-flex items-center justify-center rounded-full border border-dashed text-ink-subtle hover:text-ink hover:border-ink-subtle hover:bg-surface-muted transition',
          open ? 'border-ink-subtle bg-surface-muted text-ink' : 'border-line-strong',
        )}
        aria-label="Agregar reacción"
        aria-expanded={open}
        title="Agregar reacción"
      >
        <SmilePlus className="size-4" aria-hidden />
      </button>

      {open && (
        <Suspense fallback={null}>
          <EmojiPicker
            anchorRef={addRef}
            mine={mine}
            onSelect={(emoji) => {
              setOpen(false)
              toggle(emoji)
            }}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
