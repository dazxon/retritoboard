import { useEffect, useRef, useState } from 'react'
import { COLOR_KEYS, COLORS, type ColorKey } from '../lib/colors'

type Props = {
  value: ColorKey
  onChange: (c: ColorKey) => void
  disabled?: boolean
}

export function ColorPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  if (disabled) {
    return (
      <span
        className={`w-3 h-3 rounded-full flex-shrink-0 ${COLORS[value].dot}`}
        aria-hidden
      />
    )
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-3.5 h-3.5 rounded-full ${COLORS[value].dot} ring-2 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600 transition`}
        aria-label="Cambiar color de columna"
      />
      {open && (
        <div className="absolute top-6 left-0 z-20 flex gap-1.5 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          {COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k)
                setOpen(false)
              }}
              className={`w-5 h-5 rounded-full ${COLORS[k].dot} transition ${
                k === value
                  ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-slate-200 dark:ring-offset-slate-800'
                  : 'hover:scale-110'
              }`}
              aria-label={k}
            />
          ))}
        </div>
      )}
    </div>
  )
}
