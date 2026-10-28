import { useEffect, useState, type RefObject } from 'react'

// Arriba del anchor se ancla por bottom: si el contenido es corto el popover
// queda pegado al botón en vez de flotar con un hueco.
export type AnchoredPosition = { top?: number; bottom?: number; left: number }

const GAP = 8

// Posición `fixed` para un popover que se abre desde un botón: abajo si entra,
// si no arriba, y corrido para no salirse de la pantalla. Fixed escapa del
// overflow del tablero y las columnas. Se recalcula al scrollear o redimensionar.
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  width: number,
  maxHeight: number,
): AnchoredPosition | null {
  const [pos, setPos] = useState<AnchoredPosition | null>(null)

  useEffect(() => {
    const anchorEl = anchorRef.current
    if (!anchorEl) return
    function update() {
      if (!anchorEl) return
      const rect = anchorEl.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const placeAbove = spaceBelow < maxHeight + GAP && rect.top > spaceBelow

      let left = rect.left
      if (left + width > window.innerWidth - GAP) {
        left = Math.max(GAP, window.innerWidth - width - GAP)
      }
      setPos(
        placeAbove
          ? { bottom: window.innerHeight - rect.top + GAP, left }
          : { top: rect.bottom + GAP, left },
      )
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef, width, maxHeight])

  return pos
}
