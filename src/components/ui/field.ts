// Estilo base de inputs y textareas: borde, placeholder y foco (borde primario
// con halo suave). FIELD trae además fondo y color de texto por defecto.
// FIELD_BASE es para cuando fondo o texto son otros: se pasan aparte, para no
// tener dos clases bg-* o text-* peleando.
// Uso: className={cx(FIELD, 'h-10 px-3 text-sm')}
export const FIELD_BASE =
  'rounded-control border border-line placeholder:text-ink-subtle transition-[border-color,box-shadow] focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:focus:border-primary-400 dark:focus:ring-primary-400/20 disabled:opacity-60'

export const FIELD = `${FIELD_BASE} bg-surface text-ink`
