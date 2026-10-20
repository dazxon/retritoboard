import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { sendFeedback } from '../lib/feedback'
import { useDismiss } from '../lib/useDismiss'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { FIELD_BASE } from './ui/field'
import { cx } from './ui/cx'
import { POPOVER } from './ui/surface'
import { MessageCircle, X } from 'lucide-react'

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

  useDismiss([popoverRef, buttonRef], () => setOpen(false), open)

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
          className={cx(POPOVER, 'w-80 max-w-[calc(100vw-2rem)] p-4 flex flex-col gap-3 origin-bottom-right')}
          role="dialog"
          aria-label="Enviar feedback"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-heading font-bold text-ink">
                Mandanos feedback
              </h2>
              <p className="text-meta text-ink-subtle">Ideas, bugs o lo que se te ocurra.</p>
            </div>
            <IconButton
              label="Cerrar"
              onClick={() => setOpen(false)}
              className="self-start -mr-1"
            >
              <X />
            </IconButton>
          </div>

          {sent ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 py-6 flex flex-col items-center gap-2 text-center">
              <span className="text-3xl" aria-hidden>🙌</span>
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
                className={cx(FIELD_BASE, 'w-full px-3 py-2.5 text-sm bg-surface-muted text-ink resize-none')}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-meta tabular-nums text-ink-subtle">
                  {message.length}/{MAX_LEN}
                </span>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={sending || !user || !message.trim()}
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
              {error && (
                <p className="text-meta text-red-600 dark:text-red-400">{error}</p>
              )}
            </>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-pop size-12 flex items-center justify-center transition hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label={open ? 'Cerrar feedback' : 'Mandar feedback'}
        title="Mandar feedback"
      >
        {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
      </button>
    </div>
  )
}
