import { useEffect, useState } from 'react'
import type { VotingState } from '../lib/types'

// Misma ventana que Participants: online si hubo heartbeat en los ultimos 75s
const ONLINE_WINDOW_MS = 75_000

type ButtonProps = {
  voting: VotingState | null
  onOpen: () => void
  onClose: () => void
}

// Boton del admin en el header: arranca o cierra la votacion
export function VotingButton({ voting, onOpen, onClose }: ButtonProps) {
  if (voting?.state === 'open') {
    return (
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-2 rounded-lg text-sm font-medium transition border bg-primary-600 border-primary-600 text-white hover:bg-primary-700"
      >
        ✋ Cerrar votación
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="px-3 py-2 rounded-lg text-sm font-medium transition border bg-primary-100 dark:bg-primary-900/40 border-primary-300 dark:border-primary-800 text-primary-800 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-900/60"
    >
      {voting?.state === 'closed' ? '🗳 Votar de nuevo' : '🗳 Votar'}
    </button>
  )
}

type BannerProps = {
  voting: VotingState
  left: number
  people: { isMe: boolean; lastSeenMs: number | null; used: number }[]
  isAdmin: boolean
  onClear: () => void
}

export function VotingBanner({
  voting,
  left,
  people,
  isAdmin,
  onClear,
}: BannerProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  // "Terminaron X/Y" sobre los que estan en la sala ahora
  const online = people.filter(
    (p) => p.isMe || (p.lastSeenMs !== null && now - p.lastSeenMs < ONLINE_WINDOW_MS),
  )
  const finished = online.filter((p) => p.used >= voting.votesPerPerson).length
  const box =
    'max-w-[1500px] mx-auto mb-4 px-4 py-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/60 text-sm text-primary-900 dark:text-primary-200 flex items-start gap-2'

  if (voting.state === 'closed') {
    return (
      <div className={box}>
        <span>🏆</span>
        <span className="flex-1">
          <strong>Votación cerrada.</strong> Las tarjetas quedaron ordenadas de
          más a menos votada: arranquen por las de arriba.
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs px-2 py-0.5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50"
            title="Sacar los votos de las tarjetas"
          >
            ✕ Quitar votos
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={box}>
      <span>🗳</span>
      <span className="flex-1">
        <strong>Votación abierta.</strong>{' '}
        {left > 0 ? (
          <>
            Te quedan{' '}
            <strong className="tabular-nums">
              {left} de {voting.votesPerPerson}
            </strong>{' '}
            votos (hasta {voting.maxPerCard} por tarjeta).
          </>
        ) : (
          <>Ya usaste tus {voting.votesPerPerson} votos.</>
        )}{' '}
        Nadie ve los votos de los demás hasta que se cierre.
      </span>
      <span className="text-xs tabular-nums whitespace-nowrap opacity-80">
        Terminaron {finished}/{online.length}
      </span>
    </div>
  )
}
