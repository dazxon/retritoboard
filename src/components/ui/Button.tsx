import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'dashed'
type Size = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  // Para botones toggle (p.ej. GIF abierto): se pinta con el tinte primario
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
}

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-primary-600 hover:bg-primary-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary:
    'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60',
  ghost:
    'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60',
  // Acción destacada que no es la de marca (p.ej. Revelar)
  success:
    'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60',
  // Agregar algo nuevo (p.ej. "+ Columna")
  dashed:
    'border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-300',
}

const PRESSED =
  'bg-primary-100 dark:bg-primary-900/40 border border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-200'

const SIZE: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
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
