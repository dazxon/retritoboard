import { useEffect, useRef, useState } from 'react'
import {
  REACTIONS,
  toggleReaction,
  type CardReactions,
  type ReactionKey,
} from '../lib/reactions'

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

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
            className={`h-7 px-2 inline-flex items-center gap-1 rounded-full border text-xs tabular-nums transition ${
              mine
                ? 'bg-violet-100 dark:bg-violet-900/50 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-100'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
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
          className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-1"
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
                className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-base leading-none transition hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                  mine ? 'bg-violet-100 dark:bg-violet-900/50' : ''
                }`}
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
          className="h-7 px-2 inline-flex items-center gap-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 transition"
          aria-label="Reaccionar"
          title="Reaccionar"
        >
          <span className="text-sm leading-none grayscale opacity-70">🙂</span>
          <span className="font-semibold">+</span>
        </button>
      )}
    </div>
  )
}
