// Lógica pura de la imagen de accionables para compartir (copiar al
// portapapeles y pegar en Slack u otro chat). El dibujo en canvas vive en
// renderActionablesImage.ts; acá queda lo que se puede testear sin DOM.
import type { ColorKey } from './colors'

type Orderable = { id: string; order: number }

// Los accionables que van en la imagen, en el orden de la columna. Se guarda
// lo que se sacó (no lo que se eligió) para que un accionable nuevo que llega
// con el diálogo abierto entre solo.
export function pickActionables<T extends Orderable>(
  cards: T[],
  excluded: ReadonlySet<string>,
): T[] {
  return cards
    .filter((c) => !excluded.has(c.id))
    .sort((a, b) => a.order - b.order)
}

export function toggleExcluded(
  excluded: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(excluded)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

// Corta un texto en renglones que entran en maxWidth. Respeta los saltos de
// línea del usuario y parte las palabras que solas no entran (un link largo).
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.trim().split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      if (measure(word) <= maxWidth) {
        line = word
        continue
      }
      // Palabra más ancha que el renglón: se parte por caracteres
      line = ''
      for (const ch of Array.from(word)) {
        if (line && measure(line + ch) > maxWidth) {
          lines.push(line)
          line = ch
        } else {
          line += ch
        }
      }
    }
    if (line) lines.push(line)
  }
  // Sin renglones vacíos al final (p.ej. "texto\n\n")
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function shareFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `accionables-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.png`
}

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'accionable' : 'accionables'}`
}

// Colores en hex para el canvas (los de Tailwind son oklch y no conviene
// depender de que el canvas los entienda). Mismos tonos que lib/colors.ts.
type Hue = { accent: string; text: string; textDark: string; tint: string; tintBorder: string }

export const IMAGE_HUES: Record<ColorKey, Hue> = {
  slate: { accent: '#64748b', text: '#334155', textDark: '#e2e8f0', tint: '#f1f5f9', tintBorder: '#e2e8f0' },
  violet: { accent: '#8b5cf6', text: '#6d28d9', textDark: '#c4b5fd', tint: '#f5f3ff', tintBorder: '#ede9fe' },
  emerald: { accent: '#10b981', text: '#047857', textDark: '#6ee7b7', tint: '#ecfdf5', tintBorder: '#d1fae5' },
  amber: { accent: '#f59e0b', text: '#b45309', textDark: '#fcd34d', tint: '#fffbeb', tintBorder: '#fef3c7' },
  sky: { accent: '#0ea5e9', text: '#0369a1', textDark: '#7dd3fc', tint: '#f0f9ff', tintBorder: '#e0f2fe' },
  rose: { accent: '#f43f5e', text: '#be123c', textDark: '#fda4af', tint: '#fff1f2', tintBorder: '#ffe4e6' },
}

// Superficies y tinta: aproximación en hex de los tokens de index.css
export const IMAGE_SURFACES = {
  light: {
    canvas: '#f4f4f7',
    surface: '#ffffff',
    line: '#e4e3ea',
    ink: '#1d1b2c',
    inkMuted: '#5d5a70',
    inkSubtle: '#8b889c',
  },
  dark: {
    canvas: '#121117',
    surface: '#1c1b22',
    line: '#2f2d37',
    ink: '#f1f0f5',
    inkMuted: '#b9b7c4',
    inkSubtle: '#8e8b9b',
  },
} as const

// Hex #rrggbb + alfa → rgba() (tintes de las tarjetas en oscuro)
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
