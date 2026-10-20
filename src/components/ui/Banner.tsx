import type { ReactNode } from 'react'
import { cx } from './cx'

type Tone = 'amber' | 'emerald' | 'primary' | 'red'

const TONE: Record<Tone, { box: string; icon: string }> = {
  amber: {
    box: 'bg-amber-50 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/50 text-amber-950 dark:text-amber-100',
    icon: 'bg-amber-100 dark:bg-amber-900/50',
  },
  emerald: {
    box: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  primary: {
    box: 'bg-primary-50 dark:bg-primary-950/30 border-primary-200/80 dark:border-primary-900/50 text-primary-950 dark:text-primary-100',
    icon: 'bg-primary-100 dark:bg-primary-900/50',
  },
  red: {
    box: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-100',
    icon: 'bg-red-100 dark:bg-red-900/50',
  },
}

type Props = {
  tone: Tone
  icon?: ReactNode
  children: ReactNode
  // A la derecha: un contador o un botón chico
  aside?: ReactNode
  className?: string
}

// Aviso de ancho completo (fase de la retro, votación, errores)
export function Banner({ tone, icon, children, aside, className }: Props) {
  const t = TONE[tone]
  return (
    <div
      className={cx(
        'px-3 py-2.5 sm:px-4 rounded-card border text-sm flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5',
        t.box,
        className,
      )}
    >
      {icon && (
        <span
          className={cx('size-8 flex-shrink-0 rounded-full inline-flex items-center justify-center text-base', t.icon)}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0 leading-snug">{children}</div>
      {aside && (
        // En celular baja a su propia línea, alineado con el texto
        <div className="flex-shrink-0 flex items-center gap-2 max-sm:basis-full max-sm:pl-11">
          {aside}
        </div>
      )}
    </div>
  )
}
