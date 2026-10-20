import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from './cx'

type Variant = 'ghost' | 'secondary' | 'danger'
type Size = 'xs' | 'sm' | 'md'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  // Obligatorio: es lo que lee el lector de pantalla y el tooltip
  label: string
  variant?: Variant
  size?: Size
  ref?: Ref<HTMLButtonElement>
}

const VARIANT: Record<Variant, string> = {
  ghost: 'text-ink-subtle hover:text-ink hover:bg-surface-muted',
  secondary:
    'bg-surface border border-line-strong text-ink-muted shadow-card hover:text-ink hover:bg-surface-muted',
  // Borrar: gris en reposo, rojo al pasar
  danger:
    'text-ink-subtle hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40',
}

const SIZE: Record<Size, string> = {
  xs: 'size-6 [&_svg]:size-3.5',
  sm: 'size-7 [&_svg]:size-4',
  md: 'size-9 pointer-coarse:size-10 [&_svg]:size-[18px]',
}

// Botón solo-ícono (lucide). El ícono va como hijo; el botón le da el tamaño.
export function IconButton({
  label,
  variant = 'ghost',
  size = 'sm',
  className,
  type = 'button',
  title,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'inline-flex items-center justify-center shrink-0 rounded-control leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:shrink-0',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}
