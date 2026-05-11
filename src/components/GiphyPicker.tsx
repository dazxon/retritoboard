import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { searchGifs, type GiphyGif } from '../lib/giphy'

type Props = {
  anchorEl: HTMLElement | null
  onSelect: (gif: GiphyGif) => void
  onClose: () => void
}

const PICKER_WIDTH = 320
const PICKER_MAX_HEIGHT = 420
const GAP = 8

type Position = { top: number; left: number }

export function GiphyPicker({ anchorEl, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState<Position | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Posicionamiento via fixed (escapa cualquier overflow ancestor)
  useEffect(() => {
    if (!anchorEl) return
    function update() {
      if (!anchorEl) return
      const rect = anchorEl.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const placeAbove =
        spaceBelow < PICKER_MAX_HEIGHT + GAP && rect.top > spaceBelow

      const top = placeAbove
        ? Math.max(GAP, rect.top - PICKER_MAX_HEIGHT - GAP)
        : rect.bottom + GAP

      let left = rect.left
      if (left + PICKER_WIDTH > window.innerWidth - GAP) {
        left = Math.max(GAP, window.innerWidth - PICKER_WIDTH - GAP)
      }
      setPos({ top, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorEl])

  // Click fuera cierra
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (anchorEl && anchorEl.contains(t)) return
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [anchorEl, onClose])

  // Esc cierra
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col"
      style={{
        top: pos.top,
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
          className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>
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
                className="aspect-square overflow-hidden rounded bg-slate-100 dark:bg-slate-900 hover:ring-2 hover:ring-violet-400 transition"
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

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2 flex-shrink-0">
        Powered by GIPHY
      </p>
    </div>,
    document.body,
  )
}
