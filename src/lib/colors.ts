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

type ColorTokens = {
  bg: string
  accent: string
  dot: string
  text: string
  stripe: string
  badge: string
}

export const COLORS: Record<ColorKey, ColorTokens> = {
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-900/60',
    accent: 'bg-slate-400 dark:bg-slate-600',
    dot: 'bg-slate-400',
    text: 'text-slate-700 dark:text-slate-200',
    stripe: 'bg-slate-300 dark:bg-slate-600',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  violet: {
    bg: 'bg-violet-50/60 dark:bg-violet-950/30',
    accent: 'bg-violet-500',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    stripe: 'bg-violet-400 dark:bg-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  },
  emerald: {
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
    accent: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    stripe: 'bg-emerald-400 dark:bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  amber: {
    bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    accent: 'bg-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    stripe: 'bg-amber-400 dark:bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  },
  sky: {
    bg: 'bg-sky-50/60 dark:bg-sky-950/30',
    accent: 'bg-sky-500',
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    stripe: 'bg-sky-400 dark:bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  },
  rose: {
    bg: 'bg-rose-50/60 dark:bg-rose-950/30',
    accent: 'bg-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    stripe: 'bg-rose-400 dark:bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  },
}

export function getColor(key: ColorKey | undefined): ColorTokens {
  return COLORS[key ?? 'slate']
}
