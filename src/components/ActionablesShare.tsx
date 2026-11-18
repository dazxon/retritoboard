import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../lib/types'
import { getColor, type ColorKey } from '../lib/colors'
import {
  countLabel,
  pickActionables,
  shareFileName,
  toggleExcluded,
} from '../lib/actionablesImage'
import {
  canCopyImage,
  copyImage,
  downloadBlob,
  renderActionablesImage,
  type ImageInput,
} from '../lib/renderActionablesImage'
import { Check, Copy, Download, X } from 'lucide-react'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { Spinner } from './ui/Spinner'
import { cx } from './ui/cx'

type Props = {
  title: string
  colorKey: ColorKey
  cards: (Card & { id: string })[]
  onClose: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'copied' }
  | { kind: 'downloaded'; fallback: boolean }
  | { kind: 'error' }

// Compartir los accionables al final de la retro: elegís cuáles van y se
// copia al portapapeles una imagen lista para pegar en Slack (o se descarga
// si el navegador no deja copiar imágenes).
export function ActionablesShare({ title, colorKey, cards, onClose }: Props) {
  const colors = getColor(colorKey)
  const sorted = useMemo(() => pickActionables(cards, new Set()), [cards])
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const picked = useMemo(() => pickActionables(cards, excluded), [cards, excluded])
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [preview, setPreview] = useState<string | null>(null)
  const [copySupported] = useState(canCopyImage)

  const input = useMemo<ImageInput>(
    () => ({
      title,
      colorKey,
      dark: document.documentElement.classList.contains('dark'),
      items: picked.map((c) => ({ content: c.content, mediaUrl: c.mediaUrl })),
    }),
    [title, colorKey, picked],
  )

  // Vista previa: la misma imagen que se copia, redibujada al cambiar la selección
  const renderSeq = useRef(0)
  useEffect(() => {
    if (input.items.length === 0) return
    const seq = ++renderSeq.current
    let url: string | null = null
    const t = setTimeout(() => {
      renderActionablesImage(input)
        .then((blob) => {
          if (seq !== renderSeq.current) return
          url = URL.createObjectURL(blob)
          setPreview(url)
        })
        .catch(() => {
          if (seq === renderSeq.current) setPreview(null)
        })
    }, 150)
    return () => {
      clearTimeout(t)
      if (url) URL.revokeObjectURL(url)
    }
  }, [input])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Al cambiar la selección, el aviso de "copiada" ya no corresponde
  function select(next: Set<string> | ((prev: Set<string>) => Set<string>)) {
    setExcluded(next)
    setStatus({ kind: 'idle' })
  }

  async function download(fallback: boolean) {
    setStatus({ kind: 'working' })
    try {
      downloadBlob(await renderActionablesImage(input), shareFileName(new Date()))
      setStatus({ kind: 'downloaded', fallback })
    } catch {
      setStatus({ kind: 'error' })
    }
  }

  async function copy() {
    setStatus({ kind: 'working' })
    try {
      // La promesa va directo al ClipboardItem, sin await antes: Safari pide
      // que write() se llame dentro del click
      await copyImage(renderActionablesImage(input))
      setStatus({ kind: 'copied' })
    } catch {
      // Sin permiso o sin soporte de imágenes (p.ej. Firefox viejo): se baja
      await download(true)
    }
  }

  const none = picked.length === 0
  const working = status.kind === 'working'

  // Portal al body: la columna puede tener transform (dnd-kit) y romper el fixed
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-actionables-title"
    >
      <div
        className="relative w-full max-w-5xl max-h-full flex flex-col bg-surface rounded-2xl shadow-pop animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 shrink-0 ${colors.accent}`} aria-hidden />
        <header className="flex items-start gap-3 px-5 sm:px-6 pt-4 pb-3 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2
              id="share-actionables-title"
              className="font-display text-title font-bold text-ink"
            >
              Compartir {title.toLowerCase() === 'accionables' ? 'accionables' : `“${title}”`}
            </h2>
            <p className="text-sm text-ink-muted">
              Elegí cuáles van y copiá la imagen para pegarla en Slack.
            </p>
          </div>
          <IconButton label="Cerrar" title="Cerrar (Esc)" size="md" onClick={onClose} className="-mr-2">
            <X />
          </IconButton>
        </header>

        {sorted.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-subtle">
            Todavía no hay accionables. Copiá tarjetas con el botón 🎯 o
            escribilos en la columna.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* Selección */}
            <section className="md:overflow-y-auto p-4 sm:p-5 md:border-r border-line" aria-label="Accionables a incluir">
              <div className="flex items-center gap-2 mb-2">
                <span className="eyebrow text-ink-subtle flex-1">
                  {picked.length} de {sorted.length}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => select(new Set())}
                  disabled={excluded.size === 0}
                >
                  Todos
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => select(new Set(sorted.map((c) => c.id)))}
                  disabled={none}
                >
                  Ninguno
                </Button>
              </div>
              <ul className="grid gap-2">
                {sorted.map((c) => {
                  const on = !excluded.has(c.id)
                  const n = on ? picked.findIndex((p) => p.id === c.id) + 1 : null
                  return (
                    <li key={c.id}>
                      <label
                        className={cx(
                          'flex gap-3 items-start rounded-card border p-3 cursor-pointer select-none transition-colors',
                          on
                            ? cx(colors.bg, colors.border)
                            : 'border-line bg-surface opacity-60 hover:opacity-90',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={on}
                          onChange={() => select((prev) => toggleExcluded(prev, c.id))}
                        />
                        <span
                          className={cx(
                            'shrink-0 size-6 rounded-full inline-flex items-center justify-center text-meta font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
                            on ? cx(colors.accent, 'text-white') : 'border-2 border-line-strong',
                          )}
                          aria-hidden
                        >
                          {n}
                        </span>
                        <span className="min-w-0 flex-1 flex gap-2 items-start">
                          {c.mediaUrl && (
                            <img
                              src={c.mediaUrl}
                              alt=""
                              className="h-10 w-auto max-w-16 rounded object-cover shrink-0"
                              draggable={false}
                            />
                          )}
                          <span className="text-sm text-ink whitespace-pre-wrap break-words line-clamp-4">
                            {c.content || (c.mediaUrl ? 'GIF' : '')}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Vista previa de la imagen */}
            <section className="md:overflow-y-auto p-4 sm:p-5 bg-surface-muted/60" aria-label="Vista previa">
              <span className="eyebrow text-ink-subtle block mb-2">Vista previa</span>
              {none ? (
                <p className="py-10 text-center text-sm text-ink-subtle">
                  Elegí al menos un accionable.
                </p>
              ) : preview ? (
                <img
                  src={preview}
                  alt={`Imagen con ${countLabel(picked.length)}`}
                  className="w-full h-auto rounded-card shadow-card"
                  draggable={false}
                />
              ) : (
                <div className="py-16 flex justify-center text-ink-subtle">
                  <Spinner />
                </div>
              )}
            </section>
          </div>
        )}

        {sorted.length > 0 && (
          <footer className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 sm:px-6 py-3 border-t border-line">
            <p className="mr-auto text-sm text-ink-muted min-h-5" role="status">
              {status.kind === 'copied' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  <Check className="size-4" /> ¡Copiada! Pegala en Slack.
                </span>
              )}
              {status.kind === 'downloaded' &&
                (status.fallback
                  ? 'Tu navegador no deja copiar imágenes: la descargamos.'
                  : 'Imagen descargada.')}
              {status.kind === 'error' && 'No se pudo armar la imagen. Probá de nuevo.'}
            </p>
            {copySupported ? (
              <>
                <Button variant="secondary" onClick={() => download(false)} disabled={none || working}>
                  <Download />
                  Descargar
                </Button>
                <Button variant="primary" onClick={copy} disabled={none || working}>
                  {working ? <Spinner /> : <Copy />}
                  Copiar imagen
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => download(true)} disabled={none || working}>
                {working ? <Spinner /> : <Download />}
                Descargar imagen
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
