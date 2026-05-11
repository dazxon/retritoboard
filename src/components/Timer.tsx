import { useEffect, useRef, useState } from 'react'
import type { TimerState } from '../lib/types'
import { pauseTimer, resetTimer, startTimer } from '../lib/timer'
import { playAlarm, primeAudio } from '../lib/audio'

type Props = {
  roomId: string
  timer: TimerState
  isAdmin: boolean
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

export function Timer({ roomId, timer, isAdmin }: Props) {
  const [now, setNow] = useState(Date.now())
  const [draftSec, setDraftSec] = useState(timer.durationSec)
  const alarmFiredRef = useRef(false)
  const lastEndsAtRef = useRef<number | null>(null)
  const mountedAtRef = useRef(Date.now())

  // Sync draft con DB
  useEffect(() => {
    setDraftSec(timer.durationSec)
  }, [timer.durationSec])

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

  // Alarma: solo si la finalizacion ocurre dentro de un margen (no para late joiners)
  useEffect(() => {
    if (!finished || alarmFiredRef.current) return
    alarmFiredRef.current = true
    const ends = endsMs ?? 0
    const sinceEnded = Date.now() - ends
    const sinceMount = Date.now() - mountedAtRef.current
    if (sinceEnded < 3000 && sinceMount > 500) {
      playAlarm()
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

  const displayClass = finished
    ? 'text-red-600 dark:text-red-400 animate-pulse'
    : timer.state === 'running'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-slate-700 dark:text-slate-200'

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      {showInputs ? (
        <div className="flex items-center gap-1 font-mono">
          <input
            type="number"
            min={0}
            max={99}
            value={Math.floor(draftSec / 60)}
            onChange={(e) => onMinChange(+e.target.value || 0)}
            className="w-12 text-center text-base bg-slate-100 dark:bg-slate-900 rounded px-1 py-0.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            aria-label="Minutos"
          />
          <span className="text-slate-500">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={pad2(draftSec % 60)}
            onChange={(e) => onSecChange(+e.target.value || 0)}
            className="w-12 text-center text-base bg-slate-100 dark:bg-slate-900 rounded px-1 py-0.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            aria-label="Segundos"
          />
        </div>
      ) : (
        <span
          className={`font-mono text-lg font-bold tabular-nums ${displayClass}`}
        >
          {pad2(minutes)}:{pad2(seconds)}
        </span>
      )}

      {isAdmin && (
        <div className="flex items-center gap-1">
          {idle ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={draftSec <= 0}
              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-medium"
              aria-label="Iniciar"
              title="Iniciar"
            >
              ▶
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
              aria-label="Pausar"
              title="Pausar"
            >
              ⏸
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs"
            aria-label="Resetear a 10:00"
            title="Reset (10:00)"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  )
}
