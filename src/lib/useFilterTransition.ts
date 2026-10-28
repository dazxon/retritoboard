import { useEffect, useState } from 'react'
import {
  IN_TOTAL_MS,
  OUT_MS,
  pickEffect,
  uidsKey,
  type CardEffect,
  type CardMotion,
} from './cardMotion'

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Aplica el filtro de participantes con transición: mientras salen las
// tarjetas se sigue dibujando el filtro anterior, y recién después entra el
// nuevo. Devuelve el filtro a dibujar y la fase actual (null = quieto).
export function useFilterTransition(selected: Set<string>) {
  const key = uidsKey(selected)
  const [target, setTarget] = useState({ key, uids: selected })
  const [applied, setApplied] = useState(selected)
  const [motion, setMotion] = useState<CardMotion | null>(null)
  const [nextEffect, setNextEffect] = useState<CardEffect>(() =>
    pickEffect(null, Math.random()),
  )
  const [reduced] = useState(prefersReducedMotion)

  // Cambio de filtro: se detecta durante el render (como en CardView) para
  // que la salida arranque en el mismo frame del click
  if (key !== target.key) {
    setTarget({ key, uids: selected })
    if (reduced) {
      setApplied(selected)
      setMotion(null)
    } else if (motion?.phase !== 'out') {
      setMotion({ phase: 'out', effect: nextEffect })
    }
  }

  useEffect(() => {
    if (motion?.phase !== 'out') return
    const t = setTimeout(() => {
      setApplied(target.uids)
      setMotion({ phase: 'in', effect: motion.effect })
      setNextEffect(pickEffect(motion.effect, Math.random()))
    }, OUT_MS)
    return () => clearTimeout(t)
  }, [motion, target])

  useEffect(() => {
    if (motion?.phase !== 'in') return
    const t = setTimeout(() => setMotion(null), IN_TOTAL_MS)
    return () => clearTimeout(t)
  }, [motion])

  return { appliedUids: applied, motion }
}
