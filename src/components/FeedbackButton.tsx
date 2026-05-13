import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { sendFeedback } from '../lib/feedback'

const MAX_LEN = 2000

export function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      const t = e.target as Node
      if (popoverRef.current?.contains(t)) return
      if (buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleToggle() {
    if (open) {
      setOpen(false)
    } else {
      setOpen(true)
      setSent(false)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!user || sending) return
    const trimmed = message.trim()
    if (!trimmed) {
      setError('Escribí algo antes de enviar')
      return
    }
    setSending(true)
    setError(null)
    try {
      await sendFeedback({
        uid: user.uid,
        message: trimmed,
        route:
          typeof window !== 'undefined'
            ? window.location.hash || window.location.pathname
            : '',
      })
      setSent(true)
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setSent(false)
      }, 1500)
    } catch (e) {
      console.error(e)
      setError('No pude enviar tu feedback. Probá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          ref={popoverRef}
          className="w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3"
          role="dialog"
          aria-label="Enviar feedback"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Mandanos feedback
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {sent ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 py-6 text-center">
              ¡Gracias! Lo recibimos.
            </p>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value.slice(0, MAX_LEN))
                  if (error) setError(null)
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="¿Qué te gustaría que mejoremos? ¿Encontraste un bug?"
                rows={5}
                disabled={sending}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {message.length}/{MAX_LEN}
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sending || !user || !message.trim()}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium transition"
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
            </>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg w-12 h-12 flex items-center justify-center text-xl transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        aria-label={open ? 'Cerrar feedback' : 'Mandar feedback'}
        title="Mandar feedback"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
