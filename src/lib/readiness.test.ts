import { describe, expect, it, vi } from 'vitest'

// readiness.ts importa el SDK para la escritura; aca solo se prueba la logica
vi.mock('./firebase', () => ({ db: {} }))
const { cardCountsByAuthor, isOnlineAt, readySummary, ONLINE_WINDOW_MS } =
  await import('./readiness')

describe('isOnlineAt', () => {
  const now = 1_000_000
  it('yo siempre estoy en línea', () => {
    expect(isOnlineAt(null, now, true)).toBe(true)
  })
  it('dentro de la ventana sí, fuera no, sin lastSeen no', () => {
    expect(isOnlineAt(now - 1000, now)).toBe(true)
    expect(isOnlineAt(now - ONLINE_WINDOW_MS, now)).toBe(false)
    expect(isOnlineAt(null, now)).toBe(false)
  })
})

describe('cardCountsByAuthor', () => {
  it('cuenta las vivas de cada autor y saltea Accionables y borradas', () => {
    const counts = cardCountsByAuthor(
      [
        { authorUid: 'a', columnId: 'bien' },
        { authorUid: 'a', columnId: 'mejorar' },
        { authorUid: 'a', columnId: 'acc' },
        { authorUid: 'b', columnId: 'bien', deleted: true },
        { authorUid: 'c', columnId: 'bien' },
      ],
      'acc',
    )
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBeUndefined()
    expect(counts.get('c')).toBe(1)
  })
  it('sin columna de accionables cuenta todo', () => {
    const counts = cardCountsByAuthor([{ authorUid: 'a', columnId: 'x' }], null)
    expect(counts.get('a')).toBe(1)
  })
})

describe('readySummary', () => {
  it('cuenta solo a los que están en línea', () => {
    expect(
      readySummary([
        { ready: true, online: true },
        { ready: false, online: true },
        { online: true },
        { ready: true, online: false },
      ]),
    ).toEqual({ ready: 1, total: 3 })
  })
  it('sala vacía', () => {
    expect(readySummary([])).toEqual({ ready: 0, total: 0 })
  })
})
