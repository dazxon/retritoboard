import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '../lib/theme'
import { IconButton } from './ui/IconButton'

const ICON: Record<Theme, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
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
  const Icon = ICON[theme]
  return (
    <IconButton
      variant="secondary"
      size="md"
      onClick={() => setTheme(NEXT[theme])}
      title={`Tema: ${LABEL[theme]} (click para cambiar)`}
      label={`Tema actual: ${LABEL[theme]}`}
    >
      <Icon />
    </IconButton>
  )
}
