import { avatarColor } from '../../lib/colors'
import { cx } from './cx'

type Size = 'xs' | 'sm' | 'md'

type Props = {
  name: string
  size?: Size
  // Punto de presencia abajo a la derecha (participantes)
  online?: boolean
  className?: string
}

const SIZE: Record<Size, string> = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-meta',
}

// Círculo con la inicial. El color sale del nombre: la misma persona tiene el
// mismo color en todas las tarjetas y en participantes.
export function Avatar({ name, size = 'xs', online, className }: Props) {
  return (
    <span
      className={cx(
        'relative rounded-full inline-flex items-center justify-center font-semibold text-white flex-shrink-0 select-none',
        avatarColor(name),
        SIZE[size],
        className,
      )}
      aria-hidden
    >
      {(name.trim() || '?').charAt(0).toUpperCase()}
      {online !== undefined && (
        <span
          className={cx(
            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface',
            online ? 'bg-emerald-500' : 'bg-line-strong',
          )}
        />
      )}
    </span>
  )
}
