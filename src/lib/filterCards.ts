import type { Card, Column } from './types'

type CardWithId = Card & { id: string }

// Tarjetas visibles agrupadas por columna, con busqueda y filtro de participante
export function groupCardsByColumn(opts: {
  cards: CardWithId[]
  columns: Column[]
  search: string
  selectedUids: Set<string>
  revealed: boolean
  currentUid: string
  // Columna a la que no se le aplica el filtro de participante (accionables
  // durante la presentación: ahí se copian tarjetas y la copia es de quien copia)
  unfilteredColumnId?: string | null
}): Map<string, CardWithId[]> {
  const { cards, columns, selectedUids, revealed, currentUid } = opts
  const s = opts.search.toLowerCase().trim()

  const m = new Map<string, CardWithId[]>()
  for (const col of columns) m.set(col.id, [])
  for (const card of cards) {
    // Soft-deleted: no se muestra a nadie. Sigue existiendo el tombstone en
    // Firestore (auditable / restaurable por consola), pero fuera de la vista.
    if (card.deleted) continue
    if (
      selectedUids.size > 0 &&
      !selectedUids.has(card.authorUid) &&
      card.columnId !== opts.unfilteredColumnId
    ) {
      continue
    }
    if (s) {
      // En tarjetas ocultas solo se busca por autor: el contenido no se filtra
      const isHiddenForMe = !revealed && card.authorUid !== currentUid
      const haystack = isHiddenForMe
        ? card.authorName.toLowerCase()
        : (card.content + ' ' + card.authorName).toLowerCase()
      if (!haystack.includes(s)) continue
    }
    m.get(card.columnId)?.push(card)
  }
  // Antes de revelar, cada uno ve sus tarjetas primero (pegadas al input de
  // arriba) y las ajenas, que son placeholders, debajo. Asi las que agregan
  // los demas nunca desplazan lo propio. Al revelar, todos ven el mismo orden.
  if (!revealed) {
    for (const [colId, arr] of m) {
      m.set(colId, [
        ...arr.filter((c) => c.authorUid === currentUid),
        ...arr.filter((c) => c.authorUid !== currentUid),
      ])
    }
  }
  return m
}
