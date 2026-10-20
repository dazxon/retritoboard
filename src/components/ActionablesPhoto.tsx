import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../lib/types'
import { getColor, type ColorKey } from '../lib/colors'
import { X } from 'lucide-react'
import { IconButton } from './ui/IconButton'

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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} para la foto`}
    >
      <div
        className="relative w-full max-w-4xl max-h-full overflow-y-auto bg-surface rounded-2xl shadow-pop animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-2 ${colors.accent} rounded-t-2xl`} aria-hidden />
        <IconButton
          label="Cerrar"
          title="Cerrar (Esc)"
          size="md"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full"
        >
          <X />
        </IconButton>

        <div className="px-6 sm:px-10 pt-6 pb-8">
          <header className="mb-6 pr-10">
            <h2 className={`font-display text-3xl sm:text-4xl font-extrabold tracking-tight ${colors.text}`}>
              🎯 {title}
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted first-letter:uppercase">
              {today} · {sorted.length}{' '}
              {sorted.length === 1 ? 'accionable' : 'accionables'}
            </p>
          </header>

          {sorted.length === 0 ? (
            <p className="py-10 text-center text-ink-subtle">
              Todavía no hay accionables. Copiá tarjetas con el botón 🎯 o
              escribilos en la columna.
            </p>
          ) : (
            <ol
              className={`grid gap-3 ${sorted.length > 4 ? 'md:grid-cols-2' : ''}`}
            >
              {sorted.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex gap-3.5 items-start rounded-card border ${colors.bg} ${colors.border} p-4`}
                >
                  <span
                    className={`flex-shrink-0 size-8 rounded-full ${colors.accent} text-white font-display font-bold inline-flex items-center justify-center shadow-sm`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {c.mediaUrl && (
                      <img
                        src={c.mediaUrl}
                        alt=""
                        className="max-h-32 rounded-md mb-2"
                        draggable={false}
                      />
                    )}
                    {c.content && (
                      <p className="text-lg leading-snug font-medium text-ink whitespace-pre-wrap break-words">
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
