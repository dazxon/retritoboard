export type ColorKey =
  | 'slate'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'rose'

export const COLOR_KEYS: ColorKey[] = [
  'slate',
  'violet',
  'emerald',
  'amber',
  'sky',
  'rose',
]

// Nombres para lectores de pantalla y tooltips
export const COLOR_LABELS: Record<ColorKey, string> = {
  slate: 'Gris',
  violet: 'Violeta',
  emerald: 'Verde',
  amber: 'Ámbar',
  sky: 'Celeste',
  rose: 'Rosa',
}

type ColorTokens = {
  // Fondo y borde de la columna (tinte suave)
  bg: string
  border: string
  // Relleno sólido: barra superior, números de la vista de foto
  accent: string
  dot: string
  text: string
  // Indicador lateral de la tarjeta
  stripe: string
  badge: string
}

export const COLORS: Record<ColorKey, ColorTokens> = {
  slate: {
    bg: 'bg-slate-100/70 dark:bg-white/[0.03]',
    border: 'border-slate-200/80 dark:border-white/[0.06]',
    accent: 'bg-slate-400 dark:bg-slate-500',
    dot: 'bg-slate-400',
    text: 'text-slate-700 dark:text-slate-200',
    stripe: 'bg-slate-300 dark:bg-slate-500',
    badge: 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  },
  violet: {
    bg: 'bg-violet-50/70 dark:bg-violet-400/[0.05]',
    border: 'border-violet-100 dark:border-violet-400/10',
    accent: 'bg-violet-500',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    stripe: 'bg-violet-400 dark:bg-violet-400',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200',
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-400/[0.05]',
    border: 'border-emerald-100 dark:border-emerald-400/10',
    accent: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    stripe: 'bg-emerald-400 dark:bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-400/[0.05]',
    border: 'border-amber-100 dark:border-amber-400/10',
    accent: 'bg-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    stripe: 'bg-amber-400 dark:bg-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
  },
  sky: {
    bg: 'bg-sky-50/70 dark:bg-sky-400/[0.05]',
    border: 'border-sky-100 dark:border-sky-400/10',
    accent: 'bg-sky-500',
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    stripe: 'bg-sky-400 dark:bg-sky-400',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-400/[0.05]',
    border: 'border-rose-100 dark:border-rose-400/10',
    accent: 'bg-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    stripe: 'bg-rose-400 dark:bg-rose-400',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200',
  },
}

// Colores de avatar: sólidos, legibles con texto blanco en claro y oscuro
export const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-sky-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-600',
  'bg-indigo-500',
  'bg-fuchsia-500',
  'bg-orange-500',
  'bg-cyan-600',
]

// Color estable por nombre: la misma persona siempre sale igual, en cualquier
// navegador (no depende del uid, que cambia por dispositivo)
export function avatarColor(name: string): string {
  const key = name.trim().toLowerCase()
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function getColor(key: ColorKey | undefined): ColorTokens {
  return COLORS[key ?? 'slate']
}
