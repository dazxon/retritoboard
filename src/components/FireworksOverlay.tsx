import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  kind: 'rocket' | 'spark'
}

const COLORS = [
  '#fb7185',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#facc15',
  '#22d3ee',
]

const GRAVITY = 0.08
const DURATION_MS = 4500
const LAUNCH_WINDOW_MS = 3200

type Props = {
  onDone: () => void
}

export function FireworksOverlay({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      const t = setTimeout(() => onDoneRef.current(), 1200)
      return () => clearTimeout(t)
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    function resize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let particles: Particle[] = []
    let lastLaunch = -1000
    const startMs = performance.now()
    let raf = 0

    function w() {
      return window.innerWidth
    }
    function h() {
      return window.innerHeight
    }

    function launchRocket() {
      const startX = w() * (0.15 + Math.random() * 0.7)
      const targetY = h() * (0.18 + Math.random() * 0.35)
      const startY = h() + 10
      const dy = startY - targetY
      const vy = -Math.sqrt(2 * GRAVITY * dy) * (0.95 + Math.random() * 0.1)
      const vx = (Math.random() - 0.5) * 1.2
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      particles.push({
        x: startX,
        y: startY,
        vx,
        vy,
        life: 0,
        maxLife: 200,
        color,
        size: 2.5,
        kind: 'rocket',
      })
    }

    function explode(x: number, y: number, color: string) {
      const n = 50 + Math.floor(Math.random() * 35)
      const speed = 2.5 + Math.random() * 1.5
      const multiColor = Math.random() < 0.35
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.18
        const s = speed * (0.6 + Math.random() * 0.6)
        const c = multiColor
          ? COLORS[Math.floor(Math.random() * COLORS.length)]
          : color
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s,
          life: 0,
          maxLife: 60 + Math.random() * 30,
          color: c,
          size: 2 + Math.random() * 1.8,
          kind: 'spark',
        })
      }
    }

    function tick() {
      const elapsed = performance.now() - startMs
      const cw = w()
      const ch = h()
      ctx!.clearRect(0, 0, cw, ch)

      // Launch new rockets durante el lanzamiento
      if (
        elapsed < LAUNCH_WINDOW_MS &&
        elapsed - lastLaunch > 220 + Math.random() * 250
      ) {
        lastLaunch = elapsed
        launchRocket()
        if (Math.random() < 0.35) launchRocket()
      }

      ctx!.globalCompositeOperation = 'lighter'
      const next: Particle[] = []
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += GRAVITY
        p.life++

        if (p.kind === 'rocket' && p.vy >= -0.5) {
          explode(p.x, p.y, p.color)
          continue
        }
        if (p.life >= p.maxLife) continue
        if (p.y > ch + 30) continue

        const alpha =
          p.kind === 'rocket' ? 1 : Math.max(0, 1 - p.life / p.maxLife)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = alpha
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fill()

        // Glow secundario
        ctx!.globalAlpha = alpha * 0.35
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2)
        ctx!.fill()
        next.push(p)
      }
      ctx!.globalAlpha = 1
      ctx!.globalCompositeOperation = 'source-over'
      particles = next

      if (elapsed < DURATION_MS || particles.length > 0) {
        raf = requestAnimationFrame(tick)
      } else {
        onDoneRef.current()
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-40 animate-fireworks-fade"
      aria-hidden
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center select-none">
        <div className="text-6xl sm:text-7xl drop-shadow-lg">🎉</div>
        <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          ¡Se acabó el tiempo!
        </div>
      </div>
    </div>,
    document.body,
  )
}
