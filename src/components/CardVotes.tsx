import type { PointerEvent } from 'react'

type Props = {
  state: 'open' | 'closed'
  mine: number
  total: number
  maxPerCard: number
  canAdd: boolean
  onVote: (delta: 1 | -1) => void
}

// Fila de votos de una tarjeta. Abierta: tus votos y +/-. Cerrada: el total.
export function CardVotes({ state, mine, total, maxPerCard, canAdd, onVote }: Props) {
  if (state === 'closed') {
    if (total === 0) return null
    return (
      <div className="mt-2 flex justify-end">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-primary-600 text-white"
          title={`${total} ${total === 1 ? 'voto' : 'votos'}`}
        >
          🗳 {total}
        </span>
      </div>
    )
  }

  const stop = (e: PointerEvent) => e.stopPropagation()

  if (mine === 0) {
    return (
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onVote(1)}
          onPointerDown={stop}
          disabled={!canAdd}
          className="px-2.5 py-1 rounded-full text-xs font-medium border border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
          title={canAdd ? 'Votar esta tarjeta' : 'No te quedan votos'}
        >
          🗳 Votar
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex justify-end">
      <div className="inline-flex items-center rounded-full bg-primary-600 text-white text-xs font-bold">
        <button
          type="button"
          onClick={() => onVote(-1)}
          onPointerDown={stop}
          className="w-7 h-7 rounded-full hover:bg-primary-700 transition"
          aria-label="Sacar un voto"
          title="Sacar un voto"
        >
          −
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
          className="w-7 h-7 rounded-full hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          aria-label="Sumar un voto"
          title={canAdd ? 'Sumar un voto' : 'No podés sumar más votos acá'}
        >
          +
        </button>
      </div>
    </div>
  )
}
