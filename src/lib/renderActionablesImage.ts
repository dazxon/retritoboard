// Dibuja en un canvas la imagen de accionables para compartir y la devuelve
// como PNG. Lleva solo los accionables: sin logo, nombre de la app ni de la
// sala, para que se pueda pegar en cualquier chat sin marca. Canvas a mano (sin librerías): el layout es simple y así no se
// suma peso al bundle. La lógica testeable está en actionablesImage.ts.
import type { ColorKey } from './colors'
import {
  IMAGE_HUES,
  IMAGE_SURFACES,
  countLabel,
  withAlpha,
  wrapLines,
} from './actionablesImage'

export type ImageItem = { content: string; mediaUrl?: string }

export type ImageInput = {
  title: string
  colorKey: ColorKey
  items: ImageItem[]
  dark: boolean
  date?: Date
}

const DISPLAY = '"Plus Jakarta Sans Variable", "Inter Variable", system-ui, sans-serif'
const SANS = '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

// Medidas en px lógicos; el canvas se dibuja al doble para que se vea nítido
const W = 1080
const MARGIN = 40
const PANEL_X = MARGIN
const PANEL_W = W - MARGIN * 2
const PAD = 56
const INNER_W = PANEL_W - PAD * 2
const BAR_H = 12
const TITLE = { size: 52, lh: 62 }
const SUB = { size: 24, lh: 34 }
const ITEM = { size: 30, lh: 42, pad: 26, gap: 16, num: 48, numGap: 22 }
const GIF_MAX_H = 220
// Tope de píxeles del canvas (Safari no dibuja más de ~16M)
const MAX_PIXELS = 15_000_000

function font(weight: number, size: number, family: string) {
  return `${weight} ${size}px ${family}`
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// GIF de la tarjeta (primer cuadro). Con CORS para no "ensuciar" el canvas;
// si no carga a tiempo, la tarjeta va sin imagen.
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(null), 5000)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img.naturalWidth > 0 ? img : null)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

async function loadFonts() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(font(800, TITLE.size, DISPLAY)),
      document.fonts.load(font(700, 22, DISPLAY)),
      document.fonts.load(font(500, ITEM.size, SANS)),
      document.fonts.load(font(500, SUB.size, SANS)),
    ])
  } catch {
    // Sin las fuentes se dibuja con las del sistema
  }
}

export async function renderActionablesImage(input: ImageInput): Promise<Blob> {
  const { title, colorKey, items, dark } = input
  const hue = IMAGE_HUES[colorKey] ?? IMAGE_HUES.violet
  const s = dark ? IMAGE_SURFACES.dark : IMAGE_SURFACES.light

  const [images] = await Promise.all([
    Promise.all(items.map((it) => (it.mediaUrl ? loadImage(it.mediaUrl) : null))),
    loadFonts(),
  ])

  // Contexto de medición (mismo font que al dibujar)
  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) throw new Error('canvas no disponible')
  const measureWith = (f: string) => (text: string) => {
    probe.font = f
    return probe.measureText(text).width
  }

  const titleFont = font(800, TITLE.size, DISPLAY)
  const subFont = font(500, SUB.size, SANS)
  const itemFont = font(500, ITEM.size, SANS)

  const titleLines = wrapLines(`🎯 ${title}`, INNER_W, measureWith(titleFont))
  const date = (input.date ?? new Date()).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const subParts = [date.charAt(0).toUpperCase() + date.slice(1), countLabel(items.length)]
  const subLines = wrapLines(subParts.filter(Boolean).join(' · '), INNER_W, measureWith(subFont))

  const textX = ITEM.pad + ITEM.num + ITEM.numGap
  const textW = INNER_W - textX - ITEM.pad
  const blocks = items.map((it, i) => {
    const img = images[i]
    let gif: { w: number; h: number } | null = null
    if (img) {
      const ratio = img.naturalWidth / img.naturalHeight
      const h = Math.min(GIF_MAX_H, textW / ratio)
      gif = { w: h * ratio, h }
    }
    const lines = it.content.trim() ? wrapLines(it.content, textW, measureWith(itemFont)) : []
    const contentH = (gif ? gif.h + (lines.length ? 16 : 0) : 0) + lines.length * ITEM.lh
    const h = Math.max(ITEM.num, contentH) + ITEM.pad * 2
    return { lines, gif, img, h }
  })

  const headerH = titleLines.length * TITLE.lh + 10 + subLines.length * SUB.lh
  const listH = blocks.reduce((sum, b) => sum + b.h, 0) + Math.max(0, blocks.length - 1) * ITEM.gap
  const panelH = BAR_H + PAD + headerH + 40 + listH + PAD
  const H = panelH + MARGIN * 2

  const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (W * H)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas no disponible')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'top'

  // Fondo
  ctx.fillStyle = s.canvas
  ctx.fillRect(0, 0, W, H)

  // Panel con sombra suave
  ctx.save()
  ctx.shadowColor = dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(30, 27, 60, 0.10)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 12
  ctx.fillStyle = s.surface
  roundedRect(ctx, PANEL_X, MARGIN, PANEL_W, panelH, 32)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = s.line
  ctx.lineWidth = 1
  roundedRect(ctx, PANEL_X + 0.5, MARGIN + 0.5, PANEL_W - 1, panelH - 1, 32)
  ctx.stroke()

  // Barra de color arriba, recortada por el borde redondeado del panel
  ctx.save()
  roundedRect(ctx, PANEL_X, MARGIN, PANEL_W, panelH, 32)
  ctx.clip()
  ctx.fillStyle = hue.accent
  ctx.fillRect(PANEL_X, MARGIN, PANEL_W, BAR_H)
  ctx.restore()

  const left = PANEL_X + PAD
  let y = MARGIN + BAR_H + PAD

  // Título y subtítulo
  ctx.font = titleFont
  ctx.fillStyle = dark ? hue.textDark : hue.text
  for (const line of titleLines) {
    ctx.fillText(line, left, y + (TITLE.lh - TITLE.size) / 2)
    y += TITLE.lh
  }
  y += 10
  ctx.font = subFont
  ctx.fillStyle = s.inkMuted
  for (const line of subLines) {
    ctx.fillText(line, left, y + (SUB.lh - SUB.size) / 2)
    y += SUB.lh
  }
  y += 40

  // Accionables
  blocks.forEach((b, i) => {
    ctx.fillStyle = dark ? withAlpha(hue.accent, 0.09) : hue.tint
    roundedRect(ctx, left, y, INNER_W, b.h, 20)
    ctx.fill()
    ctx.strokeStyle = dark ? withAlpha(hue.accent, 0.2) : hue.tintBorder
    ctx.lineWidth = 1.5
    roundedRect(ctx, left + 0.75, y + 0.75, INNER_W - 1.5, b.h - 1.5, 20)
    ctx.stroke()

    // Número
    const cx = left + ITEM.pad + ITEM.num / 2
    const cy = y + ITEM.pad + ITEM.num / 2
    ctx.fillStyle = hue.accent
    ctx.beginPath()
    ctx.arc(cx, cy, ITEM.num / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = font(700, 22, DISPLAY)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), cx, cy + 1)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let ty = y + ITEM.pad + (ITEM.num - ITEM.lh) / 2
    if (b.gif && b.img) {
      ty = y + ITEM.pad
      ctx.save()
      roundedRect(ctx, left + textX, ty, b.gif.w, b.gif.h, 12)
      ctx.clip()
      ctx.drawImage(b.img, left + textX, ty, b.gif.w, b.gif.h)
      ctx.restore()
      ty += b.gif.h + 16
    }
    ctx.font = itemFont
    ctx.fillStyle = s.ink
    for (const line of b.lines) {
      ctx.fillText(line, left + textX, ty + (ITEM.lh - ITEM.size) / 2)
      ty += ITEM.lh
    }
    y += b.h + ITEM.gap
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('no se pudo generar la imagen'))),
      'image/png',
    )
  })
}

// Copia la imagen al portapapeles. Recibe la promesa (no el blob) para que
// Safari no pierda el "gesto del usuario" mientras se dibuja.
export function canCopyImage(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!navigator.clipboard?.write &&
    typeof window.ClipboardItem !== 'undefined'
  )
}

export async function copyImage(blob: Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
