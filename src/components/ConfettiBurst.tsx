import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { confettiCount } from '../lib/reveal'

// Confetti corto al revelar: dos cañitas desde las esquinas de abajo. Canvas
// propio (sin dependencias), no toma clicks y dura menos de 2 segundos.

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  w: number
  h: number
  color: string
  wobble: number
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#facc15', '#ec4899']
const GRAVITY = 0.32
const DRAG = 0.985
const DURATION_MS = 1900
const FADE_MS = 500
const MESSAGE_MS = 1600

type Props = {
  onDone: () => void
  message?: string
}

export function ConfettiBurst({ onDone, message = '¡Tarjetas a la vista!' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    // Con movimiento reducido: solo el cartel, sin confetti
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (reduced || !canvas || !ctx) {
      const t = setTimeout(() => onDoneRef.current(), MESSAGE_MS)
      return () => clearTimeout(t)
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Velocidad para llegar a ~60-90% del alto de la pantalla
    const reach = Math.sqrt(2 * GRAVITY * H)
    const total = confettiCount(W)
    const pieces: Piece[] = []
    for (let i = 0; i < total; i++) {
      const left = i % 2 === 0
      // Ángulo hacia el centro, entre 55° y 80° sobre la horizontal
      const angle = ((55 + Math.random() * 25) * Math.PI) / 180
      const speed = reach * (0.75 + Math.random() * 0.35)
      pieces.push({
        x: left ? -8 : W + 8,
        y: H + 8,
        vx: Math.cos(angle) * speed * (left ? 1 : -1) * (0.6 + Math.random() * 0.6),
        vy: -Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 5,
        h: 3 + Math.random() * 4,
        color: COLORS[i % COLORS.length],
        wobble: Math.random() * Math.PI * 2,
      })
    }

    const start = performance.now()
    let raf = 0
    function tick(now: number) {
      const elapsed = now - start
      ctx!.clearRect(0, 0, W, H)
      ctx!.globalAlpha = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / FADE_MS))
      for (const p of pieces) {
        p.vx *= DRAG
        p.vy = p.vy * DRAG + GRAVITY
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vrot
        p.wobble += 0.15
        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rot)
        // Achatar en un eje simula que gira en 3D
        ctx!.scale(1, Math.cos(p.wobble))
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      }
      if (elapsed < DURATION_MS) raf = requestAnimationFrame(tick)
      else onDoneRef.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-40" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-x-0 top-20 flex justify-center px-page">
        <div className="animate-reveal-toast flex items-center gap-2 rounded-full bg-surface border border-line shadow-pop px-4 py-2 font-display text-heading sm:text-title font-bold text-ink">
          <span aria-hidden>👀</span>
          {message}
        </div>
      </div>
    </div>,
    document.body,
  )
}
