import { describe, expect, it } from 'vitest'
import {
  describeReaction,
  describeReactors,
  groupReactions,
  isEmoji,
  planToggle,
  quickEmojis,
} from './reactions'

describe('isEmoji', () => {
  it('acepta emojis simples, con tono de piel, ZWJ, banderas y keycaps', () => {
    for (const e of ['👍', '❤️', '❤', '👍🏽', '👨‍👩‍👧', '🇦🇷', '1️⃣', '🏳️‍🌈']) {
      expect(isEmoji(e), e).toBe(true)
    }
  })

  it('rechaza texto, números sueltos y mezclas', () => {
    for (const e of ['', 'caca', '123', '#', '👍hola', 'a👍', '<b>']) {
      expect(isEmoji(e), e).toBe(false)
    }
  })
})

describe('groupReactions', () => {
  it('junta por emoji y ordena por la primera vez que se usó', () => {
    const chips = groupReactions(
      {
        ana: { '🎉': 300, '🔥': 100 },
        caro: { '🎉': 200 },
        juan: { '🔥': 400 },
      },
      undefined,
    )
    expect(chips).toEqual([
      { emoji: '🔥', uids: ['ana', 'juan'], since: 100 },
      { emoji: '🎉', uids: ['ana', 'caro'], since: 200 },
    ])
  })

  it('mezcla el formato viejo al principio, sin duplicar personas', () => {
    const chips = groupReactions(
      { ana: { '👍': 50, '🦄': 10 } },
      { like: ['ana', 'caro'], love: ['juan'] },
    )
    expect(chips.map((c) => [c.emoji, c.uids])).toEqual([
      ['👍', ['ana', 'caro']],
      ['❤️', ['juan']],
      ['🦄', ['ana']],
    ])
  })

  it('trata igual el emoji con y sin selector de variación', () => {
    const chips = groupReactions({ ana: { '❤': 1 }, caro: { '❤️': 2 } }, undefined)
    expect(chips).toHaveLength(1)
    expect(chips[0].uids).toEqual(['ana', 'caro'])
  })

  it('ignora keys que no son emojis y datos raros', () => {
    const chips = groupReactions(
      { ana: { hackeada: 1, '👀': 'x' as unknown as number }, caro: null as never },
      { like: 'x' as never },
    )
    expect(chips).toEqual([{ emoji: '👀', uids: ['ana'], since: 0 }])
  })
})

describe('planToggle', () => {
  it('pone el emoji si no lo tenía', () => {
    expect(planToggle({ caro: { '🎉': 1 } }, undefined, '🎉', 'ana')).toEqual({
      add: true,
      emojiKey: '🎉',
    })
  })

  it('lo saca si ya lo tenía, con la key como estaba guardada', () => {
    expect(planToggle({ ana: { '❤': 1 } }, undefined, '❤️', 'ana')).toEqual({
      add: false,
      emojiKey: '❤',
      legacyKey: undefined,
    })
  })

  it('sacar también limpia el formato viejo', () => {
    expect(planToggle(undefined, { like: ['ana'] }, '👍', 'ana')).toEqual({
      add: false,
      emojiKey: '👍',
      legacyKey: 'like',
    })
    // Si el viejo es de otra persona, sumarse escribe solo en el nuevo
    expect(planToggle(undefined, { like: ['caro'] }, '👍', 'ana')).toEqual({
      add: true,
      emojiKey: '👍',
    })
  })
})

describe('describeReactors', () => {
  const names: Record<string, string> = { ana: 'Ana', caro: 'Caro', juan: 'Juan', lu: 'Lu' }
  const nameOf = (uid: string) => names[uid]

  it('arma la frase con vos primero', () => {
    expect(describeReactors(['ana'], 'ana', nameOf)).toBe('Vos')
    expect(describeReactors(['caro'], 'ana', nameOf)).toBe('Caro')
    expect(describeReactors(['caro', 'ana'], 'ana', nameOf)).toBe('Vos y Caro')
    expect(describeReactors(['caro', 'juan', 'lu'], 'ana', nameOf)).toBe('Caro, Juan y Lu')
    expect(describeReactors(['caro', 'juan', 'lu', 'ana'], 'ana', nameOf)).toBe(
      'Vos, Caro y 2 más',
    )
    expect(describeReactors(['x'], 'ana', nameOf)).toBe('Alguien')
  })
})

describe('describeReaction', () => {
  const nameOf = (uid: string) => ({ ana: 'Ana', caro: 'Caro' })[uid]

  it('conjuga según quién reaccionó', () => {
    expect(describeReaction('🎉', ['ana'], 'ana', nameOf)).toBe('Reaccionaste con 🎉')
    expect(describeReaction('🎉', ['caro'], 'ana', nameOf)).toBe('Caro reaccionó con 🎉')
    expect(describeReaction('🎉', ['caro', 'ana'], 'ana', nameOf)).toBe(
      'Vos y Caro reaccionaron con 🎉',
    )
  })
})

describe('quickEmojis', () => {
  it('pone los recientes primero y completa con los default sin repetir', () => {
    const q = quickEmojis(['🦄', '👍', 'basura'])
    expect(q).toHaveLength(8)
    expect(q.slice(0, 3)).toEqual(['🦄', '👍', '❤️'])
    expect(new Set(q).size).toBe(8)
  })
})
