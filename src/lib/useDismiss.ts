import { useEffect, useRef, type RefObject } from 'react'

type AnyRef = RefObject<HTMLElement | null>

// Cierra un popover al tocar/clickear afuera o apretar Escape. Usa
// pointerdown (no mousedown) para que funcione igual con el dedo en iPad.
// `refs`: elementos que cuentan como "adentro" (el popover y su botón).
export function useDismiss(
  refs: AnyRef | AnyRef[],
  onDismiss: () => void,
  enabled = true,
) {
  const latest = useRef({ refs, onDismiss })
  useEffect(() => {
    latest.current = { refs, onDismiss }
  })

  useEffect(() => {
    if (!enabled) return
    function onDown(e: PointerEvent) {
      const t = e.target as Node
      const { refs } = latest.current
      const list = Array.isArray(refs) ? refs : [refs]
      if (list.some((r) => r.current?.contains(t))) return
      latest.current.onDismiss()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') latest.current.onDismiss()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [enabled])
}
