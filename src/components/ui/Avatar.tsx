import { cx } from './cx'

type Props = {
  name: string
  // Clase de fondo (p.ej. el accent de la columna)
  colorClass: string
  className?: string
}

// Círculo con la inicial del nombre
export function Avatar({ name, colorClass, className }: Props) {
  return (
    <span
      className={cx(
        'w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0',
        colorClass,
        className,
      )}
      aria-hidden
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}
