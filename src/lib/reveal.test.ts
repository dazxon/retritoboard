import { describe, expect, it } from 'vitest'
import {
  REVEAL_MAX_DELAY_MS,
  REVEAL_STEP_MS,
  confettiCount,
  isRevealMoment,
  revealDelay,
} from './reveal'

describe('revealDelay', () => {
  it('la primera tarjeta de la primera columna arranca ya', () => {
    expect(revealDelay(0, 0)).toBe(0)
  })
  it('avanza en diagonal: columna y fila suman', () => {
    expect(revealDelay(1, 0)).toBe(REVEAL_STEP_MS)
    expect(revealDelay(0, 1)).toBe(REVEAL_STEP_MS)
    expect(revealDelay(2, 3)).toBe(5 * REVEAL_STEP_MS)
  })
  it('tiene tope para no trabar con muchas tarjetas', () => {
    expect(revealDelay(3, 80)).toBe(REVEAL_MAX_DELAY_MS)
  })
  it('ignora índices negativos', () => {
    expect(revealDelay(-1, -4)).toBe(0)
  })
})

describe('isRevealMoment', () => {
  it('solo de oculta a revelada', () => {
    expect(isRevealMoment(false, true)).toBe(true)
    expect(isRevealMoment(true, false)).toBe(false)
    expect(isRevealMoment(true, true)).toBe(false)
  })
  it('no al cargar una sala ya revelada', () => {
    expect(isRevealMoment(undefined, true)).toBe(false)
  })
})

describe('confettiCount', () => {
  it('menos piezas en celular, con tope en pantallas grandes', () => {
    expect(confettiCount(375)).toBe(60)
    expect(confettiCount(1024)).toBe(114)
    expect(confettiCount(2560)).toBe(160)
  })
})
