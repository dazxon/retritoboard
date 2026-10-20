import { useRef, useState } from 'react'
import {
  REACTIONS,
  toggleReaction,
  type CardReactions,
  type ReactionKey,
} from '../lib/reactions'
import { useDismiss } from '../lib/useDismiss'
import { SmilePlus } from 'lucide-react'
import { cx } from './ui/cx'

type Props = {
  roomId: string
  cardId: string
  reactions: CardReactions | undefined
  currentUid: string
}

// Chips de reacciones al pie de la tarjeta. El selector se abre inline (no en
// popover) para que no lo recorte el scroll del board, y el botón para abrirlo
// está siempre visible porque en iPad no hay hover.
export function ReactionBar({ roomId, cardId, reactions, currentUid }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useDismiss(ref, () => setOpen(false), open)

  async function toggle(key: ReactionKey) {
    const active = !!reactions?.[key]?.includes(currentUid)
    setOpen(false)
    try {
      await toggleReaction({ roomId, cardId, key, uid: currentUid, active })
    } catch (e) {
      console.error('toggleReaction failed', e)
    }
  }

  const used = REACTIONS.filter((r) => (reactions?.[r.key]?.length ?? 0) > 0)

  return (
    <div
      ref={ref}
      className="mt-2 flex flex-wrap items-center gap-1"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {used.map((r) => {
        const uids = new Set(reactions?.[r.key] ?? [])
        const mine = uids.has(currentUid)
        const others = uids.size - (mine ? 1 : 0)
        const who = mine
          ? others > 0
            ? `Vos y ${others} más`
            : 'Vos'
          : `${uids.size} persona${uids.size === 1 ? '' : 's'}`
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => toggle(r.key)}
            className={cx(
              'h-7 px-2 inline-flex items-center gap-1 rounded-full border text-meta tabular-nums transition active:scale-95',
              mine
                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-100'
                : 'bg-surface-muted border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
            aria-pressed={mine}
            aria-label={`${r.label}: ${who}`}
            title={`${r.label} · ${who}`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            <span className="font-semibold">{uids.size}</span>
          </button>
        )
      })}

      {open ? (
        <div
          className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface shadow-raised px-1 animate-pop-in"
          role="menu"
          aria-label="Elegir reacción"
        >
          {REACTIONS.map((r) => {
            const mine = !!reactions?.[r.key]?.includes(currentUid)
            return (
              <button
                key={r.key}
                type="button"
                role="menuitem"
                onClick={() => toggle(r.key)}
                className={cx(
                  'size-8 inline-flex items-center justify-center rounded-full text-base leading-none transition hover:scale-125 hover:bg-surface-muted',
                  mine && 'bg-primary-100 dark:bg-primary-900/50',
                )}
                aria-label={r.label}
                title={r.label}
              >
                {r.emoji}
              </button>
            )
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-7 w-8 inline-flex items-center justify-center rounded-full border border-dashed border-line-strong text-ink-subtle hover:text-ink hover:border-ink-subtle hover:bg-surface-muted transition"
          aria-label="Reaccionar"
          title="Reaccionar"
        >
          <SmilePlus className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
