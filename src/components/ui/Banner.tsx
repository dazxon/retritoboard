import type { ReactNode } from 'react'
import { cx } from './cx'

type Tone = 'amber' | 'emerald' | 'red'

const TONE: Record<Tone, string> = {
  amber:
    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200',
  emerald:
    'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200',
  red: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200',
}

type Props = {
  tone: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

// Aviso de ancho completo (modo escritura/revisión, errores)
export function Banner({ tone, icon, children, className }: Props) {
  return (
    <div
      className={cx(
        'px-4 py-3 rounded-control border text-sm flex items-start gap-2',
        TONE[tone],
        className,
      )}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span>{children}</span>
    </div>
  )
}
