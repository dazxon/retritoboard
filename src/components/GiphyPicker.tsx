import { useEffect, useRef, useState } from 'react'
import { searchGifs, type GiphyGif } from '../lib/giphy'

type Props = {
  onSelect: (gif: GiphyGif) => void
  onClose: () => void
}

export function GiphyPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [onClose])

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

  return (
    <div
      ref={ref}
      className="absolute z-30 left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col"
      style={{ maxHeight: '420px' }}
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
    </div>
  )
}
