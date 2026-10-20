import { cx } from './cx'

// Ruedita de carga. Hereda el color del texto.
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block size-4 rounded-full border-2 border-current border-r-transparent animate-spin',
        className,
      )}
      aria-hidden
    />
  )
}
