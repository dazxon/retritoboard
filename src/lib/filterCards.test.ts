import { describe, expect, it } from 'vitest'
import type { Timestamp } from 'firebase/firestore'
import type { Card, Column } from './types'
import { groupCardsByColumn } from './filterCards'

const columns: Column[] = [
  { id: 'bien', title: 'Lo que estuvo bien', order: 1000 },
  { id: 'mejorar', title: 'Lo que mejorar', order: 2000 },
]

function card(id: string, over: Partial<Card> = {}): Card & { id: string } {
  return {
    id,
    columnId: 'bien',
    authorUid: 'yo',
    authorName: 'Agus',
    content: `contenido ${id}`,
    createdAt: null as unknown as Timestamp,
    order: 1000,
    ...over,
  }
}

const base = {
  columns,
  search: '',
  selectedUids: new Set<string>(),
  revealed: true,
  currentUid: 'yo',
}

const ids = (m: Map<string, { id: string }[]>, col: string) =>
  (m.get(col) ?? []).map((c) => c.id)

describe('groupCardsByColumn', () => {
  it('agrupa por columna y crea listas vacias para columnas sin tarjetas', () => {
    const m = groupCardsByColumn({
      ...base,
      cards: [card('1'), card('2', { columnId: 'mejorar' })],
    })
    expect(ids(m, 'bien')).toEqual(['1'])
    expect(ids(m, 'mejorar')).toEqual(['2'])
  })

  it('descarta borradas y tarjetas de columnas que ya no existen', () => {
    const m = groupCardsByColumn({
      ...base,
      cards: [card('1', { deleted: true }), card('2', { columnId: 'vieja' }), card('3')],
    })
    expect(ids(m, 'bien')).toEqual(['3'])
    expect(m.has('vieja')).toBe(false)
  })

  it('filtra por participante', () => {
    const m = groupCardsByColumn({
      ...base,
      selectedUids: new Set(['caro']),
      cards: [card('1'), card('2', { authorUid: 'caro', authorName: 'Caro' })],
    })
    expect(ids(m, 'bien')).toEqual(['2'])
  })

  it('busca en contenido y autor, sin distinguir mayusculas', () => {
    const cards = [
      card('1', { content: 'Deploys MANUALES' }),
      card('2', { authorUid: 'caro', authorName: 'Caro' }),
      card('3'),
    ]
    expect(ids(groupCardsByColumn({ ...base, cards, search: ' manuales ' }), 'bien')).toEqual(['1'])
    expect(ids(groupCardsByColumn({ ...base, cards, search: 'caro' }), 'bien')).toEqual(['2'])
  })

  it('antes de revelar, en tarjetas ajenas solo busca por autor', () => {
    const cards = [
      card('ajena', { authorUid: 'caro', authorName: 'Caro', content: 'secreto' }),
      card('propia', { content: 'secreto propio' }),
    ]
    const m = groupCardsByColumn({ ...base, revealed: false, cards, search: 'secreto' })
    expect(ids(m, 'bien')).toEqual(['propia'])
    const porAutor = groupCardsByColumn({ ...base, revealed: false, cards, search: 'caro' })
    expect(ids(porAutor, 'bien')).toEqual(['ajena'])
  })

  it('antes de revelar pone las propias primero sin cambiar su orden relativo', () => {
    const cards = [
      card('c1', { authorUid: 'caro', order: 1000 }),
      card('y1', { order: 2000 }),
      card('c2', { authorUid: 'caro', order: 3000 }),
      card('y2', { order: 4000 }),
    ]
    expect(ids(groupCardsByColumn({ ...base, revealed: false, cards }), 'bien')).toEqual([
      'y1',
      'y2',
      'c1',
      'c2',
    ])
    // Revelada: el orden compartido tal cual llega
    expect(ids(groupCardsByColumn({ ...base, cards }), 'bien')).toEqual(['c1', 'y1', 'c2', 'y2'])
  })

  it('la columna sin filtro muestra todo aunque haya participante elegido', () => {
    const m = groupCardsByColumn({
      ...base,
      selectedUids: new Set(['otro']),
      unfilteredColumnId: 'mejorar',
      cards: [
        card('1'),
        card('2', { authorUid: 'otro' }),
        card('3', { columnId: 'mejorar' }),
      ],
    })
    expect(ids(m, 'bien')).toEqual(['2'])
    expect(ids(m, 'mejorar')).toEqual(['3'])
  })
})
