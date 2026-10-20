import { useRef, useState } from 'react'
import { COLOR_KEYS, COLOR_LABELS, COLORS, type ColorKey } from '../lib/colors'
import { useDismiss } from '../lib/useDismiss'
import { POPOVER } from './ui/surface'
import { cx } from './ui/cx'

type Props = {
  value: ColorKey
  onChange: (c: ColorKey) => void
  disabled?: boolean
}

export function ColorPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useDismiss(ref, () => setOpen(false), open)

  if (disabled) {
    return (
      <span
        className={`size-2.5 rounded-full flex-shrink-0 mx-0.5 ${COLORS[value].dot}`}
        aria-hidden
      />
    )
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="size-6 -mx-1 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Cambiar color de columna"
        aria-expanded={open}
        title="Cambiar color"
      >
        <span className={`size-2.5 rounded-full ${COLORS[value].dot}`} />
      </button>
      {open && (
        <div className={cx(POPOVER, 'absolute top-8 -left-2 z-20 flex gap-2 p-2.5')}>
          {COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k)
                setOpen(false)
              }}
              className={cx(
                'size-6 rounded-full transition',
                COLORS[k].dot,
                k === value
                  ? 'ring-2 ring-offset-2 ring-ink ring-offset-surface'
                  : 'hover:scale-110',
              )}
              aria-label={COLOR_LABELS[k]}
              aria-pressed={k === value}
              title={COLOR_LABELS[k]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
