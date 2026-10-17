import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addRecentRoom,
  formatRelativeTime,
  getRecentRooms,
  removeRecentRoom,
} from './recentRooms'

const KEY = 'retritoboard:recent-rooms'

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const room = (roomId: string, lastVisitAt: number) => ({
  roomId,
  name: `Sala ${roomId}`,
  lastVisitAt,
  isAdmin: false,
})

describe('salas recientes', () => {
  it('vacio si no hay nada o el JSON esta roto', () => {
    expect(getRecentRooms()).toEqual([])
    localStorage.setItem(KEY, '{roto')
    expect(getRecentRooms()).toEqual([])
    localStorage.setItem(KEY, '{"no":"array"}')
    expect(getRecentRooms()).toEqual([])
  })

  it('descarta entradas mal formadas y ordena por ultima visita', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([room('a', 1), { roomId: 'x' }, null, room('b', 3), room('c', 2)]),
    )
    expect(getRecentRooms().map((r) => r.roomId)).toEqual(['b', 'c', 'a'])
  })

  it('agregar una sala existente la sube sin duplicarla', () => {
    addRecentRoom(room('a', 1))
    addRecentRoom(room('b', 2))
    addRecentRoom(room('a', 3))
    expect(getRecentRooms().map((r) => r.roomId)).toEqual(['a', 'b'])
  })

  it('guarda como maximo 10', () => {
    for (let i = 0; i < 12; i++) addRecentRoom(room(`s${i}`, i))
    const rooms = getRecentRooms()
    expect(rooms).toHaveLength(10)
    expect(rooms[0].roomId).toBe('s11')
  })

  it('olvidar una sala', () => {
    addRecentRoom(room('a', 1))
    addRecentRoom(room('b', 2))
    removeRecentRoom('a')
    expect(getRecentRooms().map((r) => r.roomId)).toEqual(['b'])
  })

  it('no rompe si localStorage tira error', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    })
    expect(getRecentRooms()).toEqual([])
    expect(() => addRecentRoom(room('a', 1))).not.toThrow()
  })
})

describe('formatRelativeTime', () => {
  it('textos en español por rango', () => {
    vi.useFakeTimers()
    const now = new Date('2026-10-17T12:00:00Z').getTime()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 30_000)).toBe('ahora')
    expect(formatRelativeTime(now - 5 * 60_000)).toBe('hace 5 min')
    expect(formatRelativeTime(now - 3 * 3_600_000)).toBe('hace 3 h')
    expect(formatRelativeTime(now - 2 * 86_400_000)).toBe('hace 2 d')
    expect(formatRelativeTime(now - 30 * 86_400_000)).toMatch(/\d/)
  })
})
