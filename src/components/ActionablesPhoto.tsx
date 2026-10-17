import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../lib/types'
import { getColor, type ColorKey } from '../lib/colors'

type Props = {
  title: string
  colorKey: ColorKey
  cards: (Card & { id: string })[]
  onClose: () => void
}

// Vista en grande de los accionables, pensada para sacarle una foto al final
// de la retro y llevarla a Slack. Sin controles: solo el contenido.
export function ActionablesPhoto({ title, colorKey, cards, onClose }: Props) {
  const colors = getColor(colorKey)
  const sorted = cards.slice().sort((a, b) => a.order - b.order)
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal al body: la columna puede tener transform (dnd-kit) y romper el fixed
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} para la foto`}
    >
      <div
        className="relative w-full max-w-4xl max-h-full overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-2 ${colors.accent} rounded-t-2xl`} aria-hidden />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg"
          aria-label="Cerrar"
          title="Cerrar (Esc)"
        >
          ✕
        </button>

        <div className="px-6 sm:px-10 pt-6 pb-8">
          <header className="mb-6 pr-10">
            <h2 className={`text-3xl font-bold tracking-tight ${colors.text}`}>
              🎯 {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 first-letter:uppercase">
              {today} · {sorted.length}{' '}
              {sorted.length === 1 ? 'accionable' : 'accionables'}
            </p>
          </header>

          {sorted.length === 0 ? (
            <p className="py-10 text-center text-slate-400 dark:text-slate-500">
              Todavía no hay accionables. Copiá tarjetas con → 🎯 o escribilos
              en la columna.
            </p>
          ) : (
            <ol
              className={`grid gap-3 ${sorted.length > 4 ? 'md:grid-cols-2' : ''}`}
            >
              {sorted.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex gap-3 items-start rounded-xl ${colors.bg} p-4`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full ${colors.accent} text-white font-bold inline-flex items-center justify-center`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {c.mediaUrl && (
                      <img
                        src={c.mediaUrl}
                        alt=""
                        className="max-h-32 rounded mb-2"
                        draggable={false}
                      />
                    )}
                    {c.content && (
                      <p className="text-lg leading-snug text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
