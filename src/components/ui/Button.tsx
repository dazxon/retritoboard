import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'dashed'
type Size = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  // Para botones toggle (p.ej. GIF abierto): se pinta con el tinte primario
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
}

// Los íconos (lucide) van como hijos: el tamaño lo pone el botón
const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] active:scale-[0.97] disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed [&_svg]:shrink-0'

const VARIANT: Record<Variant, string> = {
  // La acción principal de cada vista (Crear sala, Revelar, Agregar)
  primary:
    'bg-primary-600 text-white shadow-sm shadow-primary-950/20 hover:bg-primary-700 disabled:bg-surface-muted disabled:text-ink-subtle disabled:shadow-none',
  secondary:
    'bg-surface border border-line-strong text-ink shadow-card hover:bg-surface-muted disabled:opacity-50',
  // Acción destacada que no es la principal (p.ej. Votar)
  soft:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/60 dark:text-primary-200 dark:hover:bg-primary-900/60 disabled:opacity-50',
  ghost:
    'text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50',
  // Agregar algo nuevo (p.ej. "+ Columna")
  dashed:
    'border border-dashed border-line-strong text-ink-muted hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/60 dark:hover:text-primary-200 dark:hover:bg-primary-950/40',
}

const PRESSED =
  'bg-primary-50 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-200'

const SIZE: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-meta [&_svg]:size-3.5',
  sm: 'h-8 px-3 text-sm [&_svg]:size-4',
  md: 'h-9 pointer-coarse:h-10 px-3.5 text-sm [&_svg]:size-4',
  lg: 'h-11 px-5 text-body font-semibold [&_svg]:size-[18px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  pressed,
  className,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx(BASE, pressed ? PRESSED : VARIANT[variant], SIZE[size], className)}
      {...rest}
    />
  )
}
