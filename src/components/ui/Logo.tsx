import { cx } from './cx'

// Marca: un tablerito de tres columnas. Mismo dibujo que public/favicon.svg.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="rb-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#rb-mark)" />
      <rect x="7" y="8" width="4.5" height="13" rx="2.25" fill="#fff" />
      <rect x="13.75" y="8" width="4.5" height="9" rx="2.25" fill="#fff" fillOpacity=".8" />
      <rect x="20.5" y="8" width="4.5" height="16" rx="2.25" fill="#fff" fillOpacity=".6" />
    </svg>
  )
}

// Marca + nombre
export function Logo({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark className={size === 'lg' ? 'size-11' : 'size-7'} />
      <span
        className={cx(
          'font-display font-bold tracking-tight text-ink',
          size === 'lg' ? 'text-display' : 'text-base',
        )}
      >
        retrito<span className="text-primary-600 dark:text-primary-400">board</span>
      </span>
    </span>
  )
}
