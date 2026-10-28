import { describe, expect, it, vi } from 'vitest'
import type { Timestamp } from 'firebase/firestore'
import type { Card, PresentationState } from './types'

// presentation.ts importa el SDK para las escrituras; aca solo se prueba la logica
vi.mock('./firebase', () => ({ db: {} }))
const {
  goNext,
  goPrev,
  goTo,
  isFinished,
  nextPending,
  presentersOf,
  shuffle,
  startState,
  statusOf,
  toggleDone,
} = await import('./presentation')

function card(id: string, authorUid: string, over: Partial<Card> = {}) {
  return {
    id,
    columnId: 'bien',
    authorUid,
    authorName: authorUid.toUpperCase(),
    content: id,
    createdAt: { toMillis: () => Number(id) } as Timestamp,
    order: 1000,
    ...over,
  }
}

function state(over: Partial<PresentationState> = {}): PresentationState {
  return { order: [], current: null, done: [], ...over }
}

const list = ['ana', 'beto', 'caro', 'dani']

describe('presentersOf', () => {
  it('respeta el orden guardado y cuenta solo tarjetas vivas fuera de accionables', () => {
    const p = presentersOf(
      [
        card('1', 'ana'),
        card('2', 'beto'),
        card('3', 'beto'),
        card('4', 'beto', { deleted: true }),
        card('5', 'caro', { columnId: 'acc' }),
      ],
      'acc',
      ['beto', 'ana'],
    )
    expect(p).toEqual([
      { uid: 'beto', name: 'BETO', count: 2 },
      { uid: 'ana', name: 'ANA', count: 1 },
    ])
  })

  it('los que escriben despues de arrancar van al final, por su primera tarjeta', () => {
    const p = presentersOf(
      [card('9', 'dani'), card('1', 'ana'), card('5', 'caro'), card('2', 'dani')],
      null,
      ['ana'],
    )
    expect(p.map((x) => x.uid)).toEqual(['ana', 'dani', 'caro'])
  })

  it('el que se queda sin tarjetas sale de la lista', () => {
    const p = presentersOf([card('1', 'ana')], null, ['beto', 'ana'])
    expect(p.map((x) => x.uid)).toEqual(['ana'])
  })
})

describe('shuffle y startState', () => {
  it('mezcla sin perder a nadie y arranca con el primero presentando', () => {
    const s = startState(list, () => 0)
    expect([...s.order].sort()).toEqual([...list].sort())
    expect(s.current).toBe(s.order[0])
    expect(s.done).toEqual([])
    expect(shuffle(list, () => 0.999)).toEqual(list)
  })

  it('sin presentadores no hay nadie presentando', () => {
    expect(startState([])).toEqual({ order: [], current: null, done: [] })
  })
})

describe('goNext', () => {
  it('marca al actual y pasa al siguiente que falta', () => {
    const s = goNext(state({ current: 'ana' }), list)
    expect(s.current).toBe('beto')
    expect(s.done).toEqual(['ana'])
  })

  it('saltea a los que ya presentaron y da la vuelta', () => {
    const s = goNext(state({ current: 'caro', done: ['dani', 'ana'] }), list)
    expect(s.current).toBe('beto')
    expect(s.done).toEqual(['dani', 'ana', 'caro'])
  })

  it('con el ultimo que faltaba termina la ronda', () => {
    const s = goNext(state({ current: 'dani', done: ['ana', 'beto', 'caro'] }), list)
    expect(s.current).toBeNull()
    expect(isFinished(s, list)).toBe(true)
  })

  it('guarda la lista completa como orden', () => {
    expect(goNext(state({ order: ['ana'], current: 'ana' }), list).order).toEqual(list)
  })
})

describe('nextPending', () => {
  it('sin nadie presentando arranca desde el principio', () => {
    expect(nextPending(state({ done: ['ana'] }), list)).toBe('beto')
    expect(nextPending(state({ done: list }), list)).toBeNull()
  })
})

describe('goPrev', () => {
  it('vuelve al anterior, que deja de figurar como presentado, sin marcar al actual', () => {
    const s = goPrev(state({ current: 'caro', done: ['ana', 'beto'] }), list)
    expect(s.current).toBe('beto')
    expect(s.done).toEqual(['ana'])
  })

  it('en el primero no hace nada', () => {
    const s = state({ current: 'ana' })
    expect(goPrev(s, list)).toBe(s)
  })

  it('con la ronda terminada vuelve al ultimo', () => {
    expect(goPrev(state({ done: list }), list).current).toBe('dani')
  })
})

describe('goTo', () => {
  it('marca al actual y elige a cualquiera, aunque ya haya presentado', () => {
    const s = goTo(state({ current: 'ana', done: ['caro'] }), list, 'caro')
    expect(s.current).toBe('caro')
    expect(s.done).toEqual(['ana'])
  })

  it('elegir al que ya esta presentando no cambia nada', () => {
    const s = state({ current: 'ana' })
    expect(goTo(s, list, 'ana')).toBe(s)
  })
})

describe('toggleDone y statusOf', () => {
  it('marca y desmarca a mano', () => {
    const marked = toggleDone(state({ current: 'ana' }), list, 'beto')
    expect(statusOf(marked, 'beto')).toBe('done')
    expect(statusOf(marked, 'ana')).toBe('current')
    expect(statusOf(marked, 'caro')).toBe('pending')
    expect(toggleDone(marked, list, 'beto').done).toEqual([])
  })

  it('isFinished necesita al menos un presentador', () => {
    expect(isFinished(state(), [])).toBe(false)
  })
})
