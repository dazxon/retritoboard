import { describe, expect, it } from 'vitest'
import { dropOrder, nextOrder } from './order'

const cards = [
  { id: 'a', order: 1000 },
  { id: 'b', order: 2000 },
  { id: 'c', order: 3000 },
]

describe('nextOrder', () => {
  it('arranca en 1000 en columna vacia', () => {
    expect(nextOrder(null)).toBe(1000)
  })
  it('suma 1000 al maximo', () => {
    expect(nextOrder(3000)).toBe(4000)
  })
})

describe('dropOrder', () => {
  it('columna vacia: 1000', () => {
    expect(dropOrder([], 'x', 0)).toBe(1000)
  })
  it('al principio: 1000 antes de la primera', () => {
    expect(dropOrder(cards, 'x', 0)).toBe(0)
  })
  it('al final: 1000 despues de la ultima', () => {
    expect(dropOrder(cards, 'x', 3)).toBe(4000)
  })
  it('entre dos: punto medio', () => {
    expect(dropOrder(cards, 'x', 1)).toBe(1500)
  })
  it('indice fuera de rango se acota', () => {
    expect(dropOrder(cards, 'x', 99)).toBe(4000)
    expect(dropOrder(cards, 'x', -5)).toBe(0)
  })
  it('ignora la propia tarjeta al reordenar en la misma columna', () => {
    // Mover "a" entre "b" y "c": sin "a" la lista es [b, c] y el hueco es el 1
    expect(dropOrder(cards, 'a', 1)).toBe(2500)
  })
  it('soltarla en su lugar devuelve su mismo order', () => {
    expect(dropOrder(cards, 'b', 1)).toBe(2000)
  })
  it('acepta orders negativos y fraccionarios', () => {
    const odd = [
      { id: 'a', order: -1000 },
      { id: 'b', order: 1500.5 },
    ]
    expect(dropOrder(odd, 'x', 1)).toBe(250.25)
  })
})
