import type { PointerEvent } from 'react'
import { Minus, Plus, Vote } from 'lucide-react'

type Props = {
  state: 'open' | 'closed'
  mine: number
  total: number
  maxPerCard: number
  canAdd: boolean
  onVote: (delta: 1 | -1) => void
}

// Votos de una tarjeta, en la fila de reacciones de CardView.
// Abierta: tus votos y +/-. Cerrada: el total.
export function CardVotes({ state, mine, total, maxPerCard, canAdd, onVote }: Props) {
  if (state === 'closed') {
    if (total === 0) return null
    return (
      <div className="flex justify-end">
        <span
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-meta font-bold tabular-nums bg-primary-600 text-white shadow-sm"
          title={`${total} ${total === 1 ? 'voto' : 'votos'}`}
        >
          <Vote className="size-3.5" aria-hidden />
          {total}
        </span>
      </div>
    )
  }

  const stop = (e: PointerEvent) => e.stopPropagation()

  if (mine === 0) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onVote(1)}
          onPointerDown={stop}
          disabled={!canAdd}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-meta font-semibold border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          title={canAdd ? 'Votar esta tarjeta' : 'No te quedan votos'}
        >
          <Vote className="size-3.5" aria-hidden />
          Votar
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="inline-flex items-center h-7 rounded-full bg-primary-600 text-white text-meta font-bold shadow-sm">
        <button
          type="button"
          onClick={() => onVote(-1)}
          onPointerDown={stop}
          className="size-7 inline-flex items-center justify-center rounded-full hover:bg-primary-700 transition"
          aria-label="Sacar un voto"
          title="Sacar un voto"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span
          className="px-1 tracking-tight select-none"
          aria-label={`Le diste ${mine} de ${maxPerCard} votos posibles`}
        >
          {'●'.repeat(mine)}
          <span className="opacity-40">{'○'.repeat(Math.max(0, maxPerCard - mine))}</span>
        </span>
        <button
          type="button"
          onClick={() => onVote(1)}
          onPointerDown={stop}
          disabled={!canAdd}
          className="size-7 inline-flex items-center justify-center rounded-full hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          aria-label="Sumar un voto"
          title={canAdd ? 'Sumar un voto' : 'No podés sumar más votos acá'}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
