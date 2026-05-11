import { useTheme, type Theme } from '../lib/theme'

const ICON: Record<Theme, string> = {
  light: '☀️',
  system: '🖥️',
  dark: '🌙',
}

const LABEL: Record<Theme, string> = {
  light: 'Claro',
  system: 'Sistema',
  dark: 'Oscuro',
}

const NEXT: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-base text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition leading-none"
      title={`Tema: ${LABEL[theme]} — click para cambiar`}
      aria-label={`Tema actual: ${LABEL[theme]}`}
    >
      {ICON[theme]}
    </button>
  )
}
