// Estilo base de inputs y textareas: borde, placeholder y anillo de foco.
// FIELD trae además fondo y color de texto por defecto. FIELD_BASE es para
// cuando fondo o texto son otros: se pasan aparte, para no tener dos clases
// bg-* o text-* peleando.
// Uso: className={cx(FIELD, 'px-3 py-2 text-sm')}
export const FIELD_BASE =
  'rounded-control border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60'

export const FIELD = `${FIELD_BASE} bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100`
