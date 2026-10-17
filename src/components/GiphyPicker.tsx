import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { searchGifs, type GiphyGif } from '../lib/giphy'
import { useDismiss } from '../lib/useDismiss'
import { FIELD_BASE } from './ui/field'
import { IconButton } from './ui/IconButton'
import { cx } from './ui/cx'

type Props = {
  // Botón que abre el picker: se posiciona contra él y tocarlo no cuenta como "afuera"
  anchorRef: RefObject<HTMLElement | null>
  onSelect: (gif: GiphyGif) => void
  onClose: () => void
}

const PICKER_WIDTH = 320
const PICKER_MAX_HEIGHT = 420
const GAP = 8

// Arriba del anchor se ancla por bottom: si hay pocos resultados el picker
// queda pegado al botón en vez de flotar con un hueco.
type Position = { top?: number; bottom?: number; left: number }

export function GiphyPicker({ anchorRef, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState<Position | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Posicionamiento via fixed (escapa cualquier overflow ancestor)
  useEffect(() => {
    const anchorEl = anchorRef.current
    if (!anchorEl) return
    function update() {
      if (!anchorEl) return
      const rect = anchorEl.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const placeAbove =
        spaceBelow < PICKER_MAX_HEIGHT + GAP && rect.top > spaceBelow

      let left = rect.left
      if (left + PICKER_WIDTH > window.innerWidth - GAP) {
        left = Math.max(GAP, window.innerWidth - PICKER_WIDTH - GAP)
      }
      setPos(
        placeAbove
          ? { bottom: window.innerHeight - rect.top + GAP, left }
          : { top: rect.bottom + GAP, left },
      )
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef])

  // Tap/click afuera o Escape cierra
  useDismiss([ref, anchorRef], onClose)

  // Search con debounce
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const gifs = await searchGifs(query)
        if (!cancelled) setResults(gifs)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error'
          setError(msg)
          setResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-card shadow-2xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col"
      style={{
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: PICKER_WIDTH,
        maxHeight: PICKER_MAX_HEIGHT,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar GIFs…"
          autoFocus
          className={cx(FIELD_BASE, 'flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100')}
        />
        <IconButton
          label="Cerrar"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          ✕
        </IconButton>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2 flex-shrink-0">
          {error}
        </p>
      )}

      <div className="overflow-y-auto flex-1 -mx-1">
        {loading && results.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
            Buscando…
          </p>
        ) : !loading && results.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
            Sin resultados
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1 px-1">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  onSelect(g)
                  onClose()
                }}
                className="aspect-square overflow-hidden rounded bg-slate-100 dark:bg-slate-900 hover:ring-2 hover:ring-primary-400 transition"
                title={g.title}
              >
                <img
                  src={g.previewUrl}
                  alt={g.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 flex-shrink-0">
        Powered by GIPHY
      </p>
    </div>,
    document.body,
  )
}
