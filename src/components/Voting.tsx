import { useEffect, useState } from 'react'
import { Hand, Vote, X } from 'lucide-react'
import type { VotingState } from '../lib/types'
import { Banner } from './ui/Banner'
import { Button } from './ui/Button'

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
      <Button variant="primary" onClick={onClose}>
        <Hand />
        Cerrar votación
      </Button>
    )
  }
  return (
    <Button variant="soft" onClick={onOpen}>
      <Vote />
      {voting?.state === 'closed' ? 'Votar de nuevo' : 'Votar'}
    </Button>
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

  if (voting.state === 'closed') {
    return (
      <Banner
        tone="primary"
        icon="🏆"
        className="mb-4"
        aside={
          isAdmin && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClear}
              title="Sacar los votos de las tarjetas"
            >
              <X />
              Quitar votos
            </Button>
          )
        }
      >
        <strong className="font-semibold">Votación cerrada.</strong> Las
        tarjetas quedaron ordenadas de más a menos votada: arranquen por las de
        arriba.
      </Banner>
    )
  }

  const used = voting.votesPerPerson - left
  return (
    <Banner tone="primary" icon="🗳️" className="mb-4">
      <p>
        <strong className="font-semibold">Votación abierta.</strong>{' '}
        {left > 0 ? (
          <>
            Te quedan{' '}
            <strong className="font-semibold tabular-nums">
              {left} de {voting.votesPerPerson}
            </strong>{' '}
            votos (hasta {voting.maxPerCard} por tarjeta).
          </>
        ) : (
          <>Ya usaste tus {voting.votesPerPerson} votos.</>
        )}{' '}
        Nadie ve los votos de los demás hasta que se cierre.
      </p>
      <p className="mt-1 flex items-center gap-3 text-meta opacity-80">
        <span className="inline-flex gap-1" aria-hidden>
          {Array.from({ length: voting.votesPerPerson }, (_, i) => (
            <span
              key={i}
              className={
                i < used
                  ? 'size-2 rounded-full bg-primary-500'
                  : 'size-2 rounded-full ring-1 ring-inset ring-primary-400 dark:ring-primary-600'
              }
            />
          ))}
        </span>
        <span className="tabular-nums">
          Terminaron {finished}/{online.length}
        </span>
      </p>
    </Banner>
  )
}
