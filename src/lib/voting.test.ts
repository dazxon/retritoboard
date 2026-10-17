import { describe, expect, it, vi } from 'vitest'
import type { RoomUser } from './types'

// voting.ts importa el SDK para las escrituras; aca solo se prueban las cuentas
vi.mock('./firebase', () => ({ db: {} }))
const { sumVotes, tallyVotes, votesOf } = await import('./voting')

const live = new Set(['a', 'b'])

function user(id: string, votes?: RoomUser['votes']) {
  return { id, name: id, votes } as RoomUser & { id: string }
}

describe('votesOf', () => {
  it('sin votos o de otra ronda: vacio', () => {
    expect(votesOf(undefined, 'r1', live)).toEqual({})
    expect(votesOf(user('u'), 'r1', live)).toEqual({})
    expect(votesOf(user('u', { round: 'r0', byCard: { a: 2 } }), 'r1', live)).toEqual({})
  })
  it('ignora tarjetas borradas y contadores en cero o negativos', () => {
    const u = user('u', { round: 'r1', byCard: { a: 2, b: 0, borrada: 3, c: -1 } })
    expect(votesOf(u, 'r1', live)).toEqual({ a: 2 })
  })
})

describe('sumVotes', () => {
  it('suma los votos de una persona', () => {
    expect(sumVotes({ a: 2, b: 3 })).toBe(5)
    expect(sumVotes({})).toBe(0)
  })
})

describe('tallyVotes', () => {
  it('totaliza por tarjeta solo la ronda actual', () => {
    const users = [
      user('u1', { round: 'r1', byCard: { a: 2, b: 1 } }),
      user('u2', { round: 'r1', byCard: { a: 1 } }),
      user('u3', { round: 'r0', byCard: { b: 3 } }),
      user('u4'),
    ]
    const totals = tallyVotes(users, 'r1', live)
    expect(Object.fromEntries(totals)).toEqual({ a: 3, b: 1 })
  })
})
