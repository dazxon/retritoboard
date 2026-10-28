// Transición de tarjetas al filtrar por persona: primero salen todas las que
// están a la vista y después entran las del filtro nuevo, con un efecto
// elegido al azar en cada click. Solo transform/opacity/filter (sin reflow);
// los keyframes viven en src/index.css como .card-out-<efecto> / .card-in-<efecto>.

export const CARD_EFFECTS = ['fade', 'slide', 'flip', 'blur', 'swing', 'pop'] as const
export type CardEffect = (typeof CARD_EFFECTS)[number]

export type CardMotion = { phase: 'out' | 'in'; effect: CardEffect }

// Duraciones en ms (tienen que coincidir con las de index.css)
export const OUT_MS = 160
export const IN_MS = 320
const STAGGER_MS = 35
const MAX_STAGGER_MS = 280

// Un efecto al azar distinto del anterior, para que cada click se note
export function pickEffect(prev: CardEffect | null, rnd: number): CardEffect {
  const pool = prev ? CARD_EFFECTS.filter((e) => e !== prev) : CARD_EFFECTS
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rnd * pool.length)))
  return pool[i]
}

// Cascada: cada tarjeta arranca un poco después que la anterior, con tope
// para que una columna larga no tarde una eternidad
export function staggerDelay(index: number): number {
  return Math.min(Math.max(0, index) * STAGGER_MS, MAX_STAGGER_MS)
}

// Cuánto dura la entrada completa, contando la cascada más larga posible
export const IN_TOTAL_MS = IN_MS + MAX_STAGGER_MS

export function motionClass(motion: CardMotion | null): string | undefined {
  if (!motion) return undefined
  return `card-${motion.phase}-${motion.effect}`
}

// Clave estable de un filtro de participantes (para detectar el cambio)
export function uidsKey(uids: Set<string>): string {
  return [...uids].sort().join(',')
}
