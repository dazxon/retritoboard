// Orden de tarjetas: numeros con espacio de 1000 y punto medio al soltar entre
// dos, asi un drag escribe una sola tarjeta y no renumera la columna.
export const ORDER_STEP = 1000

export function nextOrder(maxOrderInColumn: number | null) {
  return (maxOrderInColumn ?? 0) + ORDER_STEP
}

// Order nuevo para una tarjeta soltada en la posicion `index` de `destCards`
// (la lista que ve el usuario en la columna destino, ya ordenada).
export function dropOrder(
  destCards: { id: string; order: number }[],
  cardId: string,
  index: number,
): number {
  const withoutSelf = destCards.filter((c) => c.id !== cardId)
  const clamped = Math.max(0, Math.min(index, withoutSelf.length))
  const before = withoutSelf[clamped - 1]
  const after = withoutSelf[clamped]
  if (!before && !after) return ORDER_STEP
  if (!before) return after.order - ORDER_STEP
  if (!after) return before.order + ORDER_STEP
  return (before.order + after.order) / 2
}
