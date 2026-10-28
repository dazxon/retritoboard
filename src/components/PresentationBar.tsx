import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Mic, X } from 'lucide-react'
import type { PresentationState } from '../lib/types'
import {
  isFinished,
  nextPending,
  statusOf,
  type Presenter,
} from '../lib/presentation'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { PANEL } from './ui/surface'
import { cx } from './ui/cx'
import { FireworksOverlay } from './FireworksOverlay'

// Misma ventana que Participants: online si hubo heartbeat en los ultimos 75s
const ONLINE_WINDOW_MS = 75_000

type Props = {
  presenters: Presenter[]
  state: PresentationState
  lastSeenByUid: Map<string, number | null>
  currentUid: string
  isAdmin: boolean
  onNext: () => void
  onPrev: () => void
  onJump: (uid: string) => void
  onToggleDone: (uid: string) => void
  onEnd: () => void
}

function cardsLabel(n: number) {
  return n === 1 ? '1 tarjeta' : `${n} tarjetas`
}

function isTyping(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  )
}

// Ronda de presentación: quién presenta ahora, quiénes ya pasaron y quiénes
// faltan, en un orden que no cambia aunque la gente entre o salga. Todos la
// ven igual; solo el admin la maneja.
export function PresentationBar({
  presenters,
  state,
  lastSeenByUid,
  currentUid,
  isAdmin,
  onNext,
  onPrev,
  onJump,
  onToggleDone,
  onEnd,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const list = presenters.map((p) => p.uid)
  const finished = isFinished(state, list)
  const current = presenters.find((p) => p.uid === state.current) ?? null
  const currentIdx = current ? list.indexOf(current.uid) : list.length
  const doneCount = presenters.filter((p) => state.done.includes(p.uid)).length
  const upNext = presenters.find((p) => p.uid === nextPending(state, list))
  const canPrev = currentIdx > 0

  // Fuegos artificiales cuando termina la ronda (para todos, no al entrar)
  const [prevFinished, setPrevFinished] = useState(finished)
  const [fireworks, setFireworks] = useState(false)
  if (finished !== prevFinished) {
    setPrevFinished(finished)
    if (finished) setFireworks(true)
  }

  // El que presenta siempre a la vista en la fila de nombres (sin mover la página)
  const scrollerRef = useRef<HTMLOListElement>(null)
  const presentingUid = state.current
  useEffect(() => {
    const scroller = scrollerRef.current
    const el = scroller?.querySelector<HTMLElement>('[data-current]')
    if (!scroller || !el) return
    scroller.scrollTo({
      left: el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2,
      behavior: 'smooth',
    })
  }, [presentingUid])

  // Flechas del teclado para el admin (cuando comparte pantalla)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!isAdmin || finished || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return
    if (e.key === 'ArrowRight') onNext()
    else if (e.key === 'ArrowLeft' && canPrev) onPrev()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function isOnline(uid: string) {
    if (uid === currentUid) return true
    const t = lastSeenByUid.get(uid)
    return !!t && now - t < ONLINE_WINDOW_MS
  }

  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0

  return (
    <section aria-label="Ronda de presentación" className={cx(PANEL, 'mb-4 overflow-hidden')}>
      <div className="h-1 bg-surface-muted" aria-hidden>
        <div
          className="h-full bg-primary-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="p-panel flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {current ? (
            <div className="flex items-center gap-3 min-w-0 flex-1 basis-56" aria-live="polite">
              <span className="size-11 flex-shrink-0 rounded-full inline-flex items-center justify-center bg-primary-100 dark:bg-primary-900/50">
                <Avatar name={current.name} size="md" online={isOnline(current.uid)} />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-primary-700 dark:text-primary-300">
                  {current.uid === currentUid ? '¡Te toca! 🎤' : 'Presenta'}
                </p>
                <p className="flex items-baseline gap-2 min-w-0">
                  <span className="font-display text-title font-bold text-ink truncate">
                    {current.name}
                  </span>
                  <span className="text-meta text-ink-muted flex-shrink-0">
                    {cardsLabel(current.count)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1 basis-56" aria-live="polite">
              <span
                className="size-11 flex-shrink-0 rounded-full inline-flex items-center justify-center text-xl bg-primary-100 dark:bg-primary-900/50"
                aria-hidden
              >
                {finished ? '🎉' : '🎤'}
              </span>
              <div className="min-w-0">
                <p className="font-display text-heading font-bold text-ink">
                  {finished
                    ? '¡Ya presentaron todos!'
                    : list.length === 0
                      ? 'Nadie escribió tarjetas todavía'
                      : 'Ronda de presentación'}
                </p>
                <p className="text-meta text-ink-muted">
                  {finished
                    ? 'Sigan con la votación o los accionables.'
                    : isAdmin
                      ? 'Tocá un nombre para que arranque.'
                      : 'Esperando a que el admin elija quién arranca.'}
                </p>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5 ml-auto">
              {current && (
                <Button
                  variant="ghost"
                  size="sm"
                  pressed={state.done.includes(current.uid)}
                  onClick={() => onToggleDone(current.uid)}
                  title="Marcar a mano que ya presentó"
                >
                  <Check />
                  <span className="hidden md:inline">Ya presentó</span>
                </Button>
              )}
              <Button onClick={onPrev} disabled={!canPrev} title="Anterior (←)" aria-label="Anterior">
                <ChevronLeft />
                <span className="hidden md:inline">Anterior</span>
              </Button>
              {!finished && (
                <Button
                  variant="primary"
                  onClick={onNext}
                  title={upNext ? `Sigue ${upNext.name} (→)` : 'Cerrar la ronda (→)'}
                >
                  {upNext ? 'Siguiente' : 'Terminar ronda'}
                  <ChevronRight />
                </Button>
              )}
              {finished ? (
                <Button variant="primary" onClick={onEnd}>
                  <X />
                  Salir de la presentación
                </Button>
              ) : (
                <IconButton label="Salir de la presentación" size="md" onClick={onEnd}>
                  <X />
                </IconButton>
              )}
            </div>
          )}
        </div>

        {list.length > 0 && (
          <div className="flex items-center gap-3">
            <ol
              ref={scrollerRef}
              className="relative flex-1 min-w-0 flex gap-1.5 overflow-x-auto [scrollbar-width:none]"
            >
              {presenters.map((p, i) => {
                const status = statusOf(state, p.uid)
                const online = isOnline(p.uid)
                return (
                  <li key={p.uid} className="flex-shrink-0" data-current={status === 'current' || undefined}>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => onJump(p.uid)}
                      aria-current={status === 'current' || undefined}
                      title={
                        [
                          isAdmin &&
                            (status === 'current'
                              ? `${p.name} está presentando`
                              : `Que presente ${p.name}`),
                          !online && 'No está conectado',
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                      className={cx(
                        'h-9 pointer-coarse:h-10 pl-1.5 pr-3 rounded-full border flex items-center gap-2 text-sm transition disabled:cursor-default',
                        status === 'current' &&
                          'bg-primary-50 dark:bg-primary-950/60 border-primary-300 dark:border-primary-700 text-primary-900 dark:text-primary-100 font-semibold shadow-card',
                        status === 'done' &&
                          'bg-surface-muted border-transparent text-ink-subtle',
                        status === 'pending' && 'bg-surface border-line text-ink',
                        isAdmin && status !== 'current' && 'hover:border-primary-400',
                      )}
                    >
                      <span
                        className={cx(
                          'relative size-6 rounded-full inline-flex items-center justify-center text-meta font-semibold tabular-nums flex-shrink-0',
                          status === 'current' && 'bg-primary-600 text-white',
                          status === 'done' &&
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                          status === 'pending' && 'bg-surface-muted text-ink-muted',
                        )}
                        aria-hidden
                      >
                        {status === 'current' ? (
                          <Mic className="size-3.5" />
                        ) : status === 'done' ? (
                          <Check className="size-3.5" />
                        ) : (
                          i + 1
                        )}
                        {/* Presencia: verde si está en la sala, gris si se fue */}
                        <span
                          className={cx(
                            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface',
                            online ? 'bg-emerald-500' : 'bg-line-strong',
                          )}
                        />
                      </span>
                      <span className={cx('max-w-[10rem] truncate', !online && 'opacity-60')}>
                        {p.name}
                      </span>
                      <span className="text-meta tabular-nums opacity-70">{p.count}</span>
                      <span className="sr-only">
                        {status === 'current'
                          ? ', presentando'
                          : status === 'done'
                            ? ', ya presentó'
                            : ', falta'}
                        {!online && ', no está conectado'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <span
              className="flex-shrink-0 text-meta tabular-nums text-ink-muted"
              title="Ya presentaron"
            >
              <span className="font-semibold text-ink">{doneCount}</span>/{list.length}
            </span>
          </div>
        )}
      </div>
      {fireworks && (
        <FireworksOverlay
          message="¡Ya presentaron todos!"
          onDone={() => setFireworks(false)}
        />
      )}
    </section>
  )
}
