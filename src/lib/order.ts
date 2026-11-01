// Orden de tarjetas: numeros con espacio de 1000 y punto medio al soltar entre
// dos, asi un drag escribe una sola tarjeta y no renumera la columna.
export const ORDER_STEP = 1000

export function nextOrder(maxOrderInColumn: number | null) {
  return (maxOrderInColumn ?? 0) + ORDER_STEP
}

// Order nuevo para una tarjeta soltada en la posicion `index` de `destCards`
// (la lista que ve el usuario en la columna destino).
//
// `inBlock`: antes de revelar la vista esta partida en bloques (propias primero,
// ajenas despues, ver groupCardsByColumn), asi que la lista entera no esta
// ordenada por `order`. La tarjeta cae dentro de su bloque y los vecinos salen
// solo de ahi; sin `inBlock` se toma la lista como ya ordenada.
export function dropOrder<T extends { id: string; order: number }>(
  destCards: T[],
  cardId: string,
  index: number,
  inBlock?: (c: T) => boolean,
): number {
  const withoutSelf = destCards.filter((c) => c.id !== cardId)
  const clamped = Math.max(0, Math.min(index, withoutSelf.length))
  const list = inBlock ? withoutSelf.filter(inBlock) : withoutSelf
  const at = inBlock
    ? withoutSelf.slice(0, clamped).filter(inBlock).length
    : clamped
  const before = list[at - 1]
  const after = list[at]
  if (!before && !after) return ORDER_STEP
  if (!before) return after.order - ORDER_STEP
  if (!after) return before.order + ORDER_STEP
  return (before.order + after.order) / 2
}
