import { describe, expect, it } from 'vitest'
import {
  countLabel,
  pickActionables,
  shareFileName,
  toggleExcluded,
  withAlpha,
  wrapLines,
} from './actionablesImage'

// Cada caracter mide 1: el ancho es el largo del string
const measure = (s: string) => Array.from(s).length

describe('wrapLines', () => {
  it('deja en un renglón lo que entra', () => {
    expect(wrapLines('hola mundo', 20, measure)).toEqual(['hola mundo'])
  })

  it('corta por palabras', () => {
    expect(wrapLines('uno dos tres cuatro', 8, measure)).toEqual([
      'uno dos',
      'tres',
      'cuatro',
    ])
  })

  it('respeta los saltos de línea y saca los vacíos del final', () => {
    expect(wrapLines('a\n\nb\n\n', 10, measure)).toEqual(['a', '', 'b'])
  })

  it('parte una palabra más ancha que el renglón', () => {
    expect(wrapLines('ok abcdefghij', 4, measure)).toEqual([
      'ok',
      'abcd',
      'efgh',
      'ij',
    ])
  })

  it('no parte emojis por la mitad', () => {
    expect(wrapLines('🎯🎯🎯', 2, measure)).toEqual(['🎯🎯', '🎯'])
  })
})

describe('pickActionables', () => {
  const cards = [
    { id: 'c', order: 3000 },
    { id: 'a', order: 1000 },
    { id: 'b', order: 2000 },
  ]

  it('ordena por order y saca los excluidos', () => {
    expect(pickActionables(cards, new Set(['b'])).map((c) => c.id)).toEqual([
      'a',
      'c',
    ])
  })

  it('no muta la lista original', () => {
    pickActionables(cards, new Set())
    expect(cards.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('toggleExcluded', () => {
  it('suma y saca', () => {
    const one = toggleExcluded(new Set(), 'x')
    expect([...one]).toEqual(['x'])
    expect([...toggleExcluded(one, 'x')]).toEqual([])
  })
})

describe('textos y colores', () => {
  it('nombre de archivo con la fecha', () => {
    expect(shareFileName(new Date(2026, 10, 6))).toBe('accionables-2026-11-06.png')
  })

  it('singular y plural', () => {
    expect(countLabel(1)).toBe('1 accionable')
    expect(countLabel(3)).toBe('3 accionables')
  })

  it('hex a rgba', () => {
    expect(withAlpha('#8b5cf6', 0.5)).toBe('rgba(139, 92, 246, 0.5)')
  })
})
