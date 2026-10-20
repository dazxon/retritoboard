import { useEffect, useRef, useState } from 'react'
import type { TimerState } from '../lib/types'
import { pauseTimer, resetTimer, startTimer } from '../lib/timer'
import { playAlarm, primeAudio } from '../lib/audio'
import { FireworksOverlay } from './FireworksOverlay'
import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { IconButton } from './ui/IconButton'
import { cx } from './ui/cx'

type Props = {
  roomId: string
  timer: TimerState
  isAdmin: boolean
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

export function Timer({ roomId, timer, isAdmin }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [draftSec, setDraftSec] = useState(timer.durationSec)
  const [showFireworks, setShowFireworks] = useState(false)
  const alarmFiredRef = useRef(false)
  const lastEndsAtRef = useRef<number | null>(null)
  const mountedAtRef = useRef(0)

  useEffect(() => {
    mountedAtRef.current = Date.now()
  }, [])

  // Sync draft con DB: si cambia la duracion guardada, el draft la sigue
  const [prevDurationSec, setPrevDurationSec] = useState(timer.durationSec)
  if (prevDurationSec !== timer.durationSec) {
    setPrevDurationSec(timer.durationSec)
    setDraftSec(timer.durationSec)
  }

  // Tick mientras corre
  useEffect(() => {
    if (timer.state !== 'running') return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [timer.state])

  // Reset el flag de alarma cuando arranca un nuevo timer
  useEffect(() => {
    const endsMs = timer.endsAt?.toMillis() ?? null
    if (endsMs !== lastEndsAtRef.current) {
      lastEndsAtRef.current = endsMs
      alarmFiredRef.current = false
    }
  }, [timer.endsAt])

  const endsMs = timer.endsAt?.toMillis() ?? null
  const remainingSec =
    timer.state === 'running' && endsMs
      ? Math.max(0, (endsMs - now) / 1000)
      : timer.state === 'running'
        ? 0
        : isAdmin
          ? draftSec
          : timer.durationSec

  const finished = timer.state === 'running' && endsMs !== null && remainingSec <= 0

  // Alarma + fuegos artificiales: solo si la finalizacion ocurre dentro de un margen
  useEffect(() => {
    if (!finished || alarmFiredRef.current) return
    alarmFiredRef.current = true
    const ends = endsMs ?? 0
    const sinceEnded = Date.now() - ends
    const sinceMount = Date.now() - mountedAtRef.current
    if (sinceEnded < 3000 && sinceMount > 500) {
      playAlarm()
      setShowFireworks(true)
    }
  }, [finished, endsMs])

  const minutes = Math.floor(remainingSec / 60)
  const seconds = Math.floor(remainingSec % 60)

  const idle = timer.state === 'idle'
  const showInputs = isAdmin && idle

  async function handleStart() {
    primeAudio()
    const total = isAdmin ? draftSec : timer.durationSec
    if (total <= 0) return
    try {
      await startTimer(roomId, total)
    } catch (e) {
      console.error('startTimer failed', e)
    }
  }

  async function handlePause() {
    try {
      await pauseTimer(roomId, remainingSec)
    } catch (e) {
      console.error('pauseTimer failed', e)
    }
  }

  async function handleReset() {
    try {
      setDraftSec(600)
      await resetTimer(roomId, 600)
    } catch (e) {
      console.error('resetTimer failed', e)
    }
  }

  function onMinChange(v: number) {
    const safe = Math.max(0, Math.min(99, v))
    setDraftSec(safe * 60 + (draftSec % 60))
  }
  function onSecChange(v: number) {
    const safe = Math.max(0, Math.min(59, v))
    setDraftSec(Math.floor(draftSec / 60) * 60 + safe)
  }

  const running = timer.state === 'running'
  const displayClass = finished
    ? 'text-red-600 dark:text-red-400 animate-pulse'
    : running
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-ink'
  // Barra de lo que queda, mientras corre
  const progress =
    running && timer.durationSec > 0
      ? Math.min(1, remainingSec / timer.durationSec)
      : null

  const digit =
    'w-[2.25ch] bg-transparent text-center tabular-nums rounded-[6px] text-ink hover:bg-surface-muted focus:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary-500/40'

  return (
    <>
      {showFireworks && (
        <FireworksOverlay onDone={() => setShowFireworks(false)} />
      )}
      <div
        className="relative inline-flex items-center h-9 pointer-coarse:h-10 rounded-control bg-surface border border-line-strong shadow-card overflow-hidden"
        role="timer"
        aria-label="Timer"
      >
        <span className="flex items-center gap-1.5 pl-2.5 pr-2">
          <TimerIcon
            className={cx('size-4 hidden sm:block', running ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-subtle')}
            aria-hidden
          />
          {showInputs ? (
            <span className="flex items-center text-[0.9375rem] font-semibold">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={pad2(Math.floor(draftSec / 60))}
                onChange={(e) => onMinChange(+e.target.value || 0)}
                onFocus={(e) => e.target.select()}
                className={digit}
                aria-label="Minutos"
              />
              <span className="text-ink-subtle -mx-px">:</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={pad2(draftSec % 60)}
                onChange={(e) => onSecChange(+e.target.value || 0)}
                onFocus={(e) => e.target.select()}
                className={digit}
                aria-label="Segundos"
              />
            </span>
          ) : (
            <span
              className={cx('text-[0.9375rem] font-semibold tabular-nums', displayClass)}
            >
              {pad2(minutes)}:{pad2(seconds)}
            </span>
          )}
        </span>

        {isAdmin && (
          <span className="flex items-center gap-0.5 pr-1 pl-1 border-l border-line h-full">
            {idle ? (
              <IconButton
                label="Iniciar"
                onClick={handleStart}
                disabled={draftSec <= 0}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              >
                <Play className="fill-current" />
              </IconButton>
            ) : (
              <IconButton
                label="Pausar"
                onClick={handlePause}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                <Pause className="fill-current" />
              </IconButton>
            )}
            <IconButton label="Resetear a 10:00" title="Volver a 10:00" onClick={handleReset}>
              <RotateCcw />
            </IconButton>
          </span>
        )}

        {progress !== null && (
          <span
            className="absolute left-0 bottom-0 h-0.5 bg-emerald-500 transition-[width] duration-500 ease-linear"
            style={{ width: `${progress * 100}%` }}
            aria-hidden
          />
        )}
      </div>
    </>
  )
}
