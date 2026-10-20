import { describe, expect, it } from 'vitest'
import { AVATAR_COLORS, avatarColor } from './colors'

describe('avatarColor', () => {
  it('da siempre el mismo color para el mismo nombre', () => {
    expect(avatarColor('Ana')).toBe(avatarColor('Ana'))
  })

  it('ignora mayúsculas y espacios alrededor', () => {
    expect(avatarColor('  ana ')).toBe(avatarColor('Ana'))
  })

  it('sale de la paleta, también con nombre vacío', () => {
    expect(AVATAR_COLORS).toContain(avatarColor(''))
    expect(AVATAR_COLORS).toContain(avatarColor('Caro'))
  })

  it('reparte nombres distintos en varios colores', () => {
    const names = ['Ana', 'Caro', 'Juli', 'Mati', 'Sofi', 'Nico', 'Lu', 'Fer']
    expect(new Set(names.map(avatarColor)).size).toBeGreaterThan(3)
  })
})
