import { describe, expect, it } from 'vitest'
import {
  CARD_EFFECTS,
  IN_MS,
  IN_TOTAL_MS,
  motionClass,
  pickEffect,
  staggerDelay,
  uidsKey,
} from './cardMotion'

describe('pickEffect', () => {
  it('sin anterior puede elegir cualquiera', () => {
    expect(pickEffect(null, 0)).toBe(CARD_EFFECTS[0])
    expect(pickEffect(null, 0.999)).toBe(CARD_EFFECTS[CARD_EFFECTS.length - 1])
  })
  it('nunca repite el efecto anterior', () => {
    for (const prev of CARD_EFFECTS) {
      for (let r = 0; r < 1; r += 0.05) {
        expect(pickEffect(prev, r)).not.toBe(prev)
      }
    }
  })
  it('tolera rnd fuera de rango', () => {
    expect(CARD_EFFECTS).toContain(pickEffect('fade', 1))
    expect(CARD_EFFECTS).toContain(pickEffect('fade', -1))
  })
})

describe('staggerDelay', () => {
  it('crece con el indice y tiene tope', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(1)).toBeGreaterThan(0)
    expect(staggerDelay(2)).toBeGreaterThan(staggerDelay(1))
    expect(staggerDelay(1000)).toBe(staggerDelay(500))
  })
})

describe('IN_TOTAL_MS', () => {
  it('alcanza para la tarjeta mas demorada de la cascada', () => {
    expect(IN_TOTAL_MS).toBe(IN_MS + staggerDelay(1000))
  })
})

describe('motionClass', () => {
  it('arma la clase de fase y efecto', () => {
    expect(motionClass(null)).toBeUndefined()
    expect(motionClass({ phase: 'out', effect: 'flip' })).toBe('card-out-flip')
    expect(motionClass({ phase: 'in', effect: 'pop' })).toBe('card-in-pop')
  })
})

describe('uidsKey', () => {
  it('no depende del orden', () => {
    expect(uidsKey(new Set(['b', 'a']))).toBe(uidsKey(new Set(['a', 'b'])))
    expect(uidsKey(new Set())).toBe('')
  })
})
