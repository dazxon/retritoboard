import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from './cx'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  // Obligatorio: es lo que lee el lector de pantalla y el tooltip
  label: string
  ref?: Ref<HTMLButtonElement>
}

// Botón solo-ícono (✕, ✏️, 🗑…). Sin color propio: cada uso pasa el suyo.
export function IconButton({ label, className, type = 'button', title, ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'inline-flex items-center justify-center leading-none rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className,
      )}
      {...rest}
    />
  )
}
