import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { isOnlineAt, readySummary } from '../lib/readiness'
import { Button } from './ui/Button'

type Props = {
  people: Array<{ isMe: boolean; lastSeenMs: number | null; ready?: boolean }>
  myReady: boolean
  onToggle: () => void
}

// Dentro del banner de escritura: cuántos están listos y el botón propio.
// Es solo una guía para el admin, Revelar no depende de esto.
export function ReadyToggle({ people, myReady, onToggle }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const { ready, total } = readySummary(
    people.map((p) => ({ ready: p.ready, online: isOnlineAt(p.lastSeenMs, now, p.isMe) })),
  )
  const all = total > 0 && ready === total

  return (
    <>
      <span
        className="text-meta tabular-nums font-medium whitespace-nowrap"
        aria-live="polite"
      >
        <span className={all ? 'text-emerald-700 dark:text-emerald-300' : undefined}>
          {ready}/{total}
        </span>{' '}
        {total === 1 ? 'listo' : 'listos'}
      </span>
      <Button
        size="sm"
        pressed={myReady}
        onClick={onToggle}
        title={myReady ? 'Tocá para desmarcar' : 'Avisá que terminaste de escribir'}
      >
        <CircleCheck className={myReady ? 'text-emerald-600 dark:text-emerald-400' : undefined} />
        {myReady ? '¡Listo!' : 'Estoy listo'}
      </Button>
    </>
  )
}
