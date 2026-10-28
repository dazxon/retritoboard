// Reacciones estilo Slack: cualquier emoji, varios por persona en la misma
// tarjeta, y tocar un chip suma o saca tu reacción.
//
// Se guardan por persona: reactionsBy: { [uid]: { [emoji]: millis } }. Así
// firestore.rules valida con un solo chequeo (cada uno toca solo su uid) y el
// millis da el orden de los chips: como en Slack, por la primera vez que
// alguien usó ese emoji en la tarjeta.
//
// Las tarjetas de antes (set fijo de 6) tienen reactions: { like: [uid] } con
// keys ASCII. Se muestran mezcladas con las nuevas y sacar la reacción también
// la saca de ahí. Nadie escribe reacciones nuevas en ese formato.

export type ReactionsBy = Record<string, Record<string, number>>

export const LEGACY_REACTIONS = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  party: '🎉',
  think: '🤔',
  rocket: '🚀',
} as const

export type LegacyReactionKey = keyof typeof LEGACY_REACTIONS
export type LegacyReactions = Partial<Record<LegacyReactionKey, string[]>>

// Los que aparecen como rápidos en el picker hasta que uno use otros
export const DEFAULT_QUICK = ['👍', '❤️', '😂', '🎉', '🤔', '🚀', '👀', '🙌']

export type ReactionChip = {
  emoji: string
  uids: string[]
  // Primera vez que se usó (0 para las del formato viejo, que no tienen hora)
  since: number
}

// Cualquiera puede escribir cualquier key en su propio mapa (las rules no
// pueden recorrerlo), así que solo se muestran las que son emojis de verdad.
// Emoji_Component cubre ZWJ, selector de variación, keycap, tonos de piel,
// letras de banderas y tags.
const EMOJI_CHARS = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u
const EMOJI_BASE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u

export function isEmoji(s: string): boolean {
  return s.length > 0 && s.length <= 32 && EMOJI_CHARS.test(s) && EMOJI_BASE.test(s)
}

// El mismo emoji puede venir con o sin el selector de variación (❤ y ❤️):
// se comparan sin él para que no queden dos chips iguales.
function normalize(emoji: string) {
  return emoji.replace(/\uFE0F/g, '')
}

export function isSameEmoji(a: string, b: string) {
  return normalize(a) === normalize(b)
}

export function legacyKeyFor(emoji: string): LegacyReactionKey | undefined {
  const n = normalize(emoji)
  return (Object.keys(LEGACY_REACTIONS) as LegacyReactionKey[]).find(
    (k) => normalize(LEGACY_REACTIONS[k]) === n,
  )
}

export function groupReactions(
  reactionsBy: ReactionsBy | undefined,
  legacy: LegacyReactions | undefined,
): ReactionChip[] {
  const byEmoji = new Map<string, { emoji: string; uids: Set<string>; since: number }>()

  function add(emoji: string, uid: string, at: number) {
    if (!isEmoji(emoji)) return
    const key = normalize(emoji)
    const chip = byEmoji.get(key)
    if (chip) {
      chip.uids.add(uid)
      chip.since = Math.min(chip.since, at)
    } else {
      byEmoji.set(key, { emoji, uids: new Set([uid]), since: at })
    }
  }

  for (const k of Object.keys(LEGACY_REACTIONS) as LegacyReactionKey[]) {
    const uids = legacy?.[k]
    if (!Array.isArray(uids)) continue
    for (const uid of uids) add(LEGACY_REACTIONS[k], uid, 0)
  }
  for (const [uid, mine] of Object.entries(reactionsBy ?? {})) {
    if (!mine || typeof mine !== 'object') continue
    for (const [emoji, at] of Object.entries(mine)) {
      add(emoji, uid, typeof at === 'number' ? at : 0)
    }
  }

  return [...byEmoji.values()]
    .map((c) => ({ emoji: c.emoji, uids: [...c.uids], since: c.since }))
    // sort es estable: las viejas (since 0) quedan en el orden del set fijo
    .sort((a, b) => a.since - b.since)
}

// Qué hay que escribir para que `uid` ponga o saque `emoji`. Sacar limpia
// también el formato viejo; poner escribe solo en el nuevo.
export type ReactionToggle = {
  add: boolean
  // Key exacta guardada en reactionsBy[uid] (respeta cómo estaba escrita)
  emojiKey: string
  // Si hay que sacar el uid de reactions[legacyKey]
  legacyKey?: LegacyReactionKey
}

export function planToggle(
  reactionsBy: ReactionsBy | undefined,
  legacy: LegacyReactions | undefined,
  emoji: string,
  uid: string,
): ReactionToggle {
  const n = normalize(emoji)
  const mine = reactionsBy?.[uid] ?? {}
  const storedKey = Object.keys(mine).find((k) => normalize(k) === n)
  const k = legacyKeyFor(emoji)
  const legacyKey = k && legacy?.[k]?.includes(uid) ? k : undefined
  if (storedKey || legacyKey) {
    return { add: false, emojiKey: storedKey ?? emoji, legacyKey }
  }
  return { add: true, emojiKey: emoji }
}

// "Reaccionaste con 🎉", "Ana reaccionó con 🎉", "Vos, Ana y 2 más reaccionaron con 🎉"
export function describeReaction(
  emoji: string,
  uids: string[],
  currentUid: string,
  nameOf: (uid: string) => string | undefined,
): string {
  if (uids.length === 1 && uids[0] === currentUid) return `Reaccionaste con ${emoji}`
  const verb = uids.length === 1 ? 'reaccionó' : 'reaccionaron'
  return `${describeReactors(uids, currentUid, nameOf)} ${verb} con ${emoji}`
}

// "Vos", "Ana", "Vos y Ana", "Ana, Caro y 2 más"
export function describeReactors(
  uids: string[],
  currentUid: string,
  nameOf: (uid: string) => string | undefined,
): string {
  const mine = uids.includes(currentUid)
  const others = uids.filter((u) => u !== currentUid).map((u) => nameOf(u) ?? 'Alguien')
  const names = mine ? ['Vos', ...others] : others
  const shown = names.length > 3 ? names.slice(0, 2) : names
  const rest = names.length - shown.length
  if (rest > 0) return `${shown.join(', ')} y ${rest} más`
  if (shown.length <= 1) return shown[0] ?? ''
  return `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}`
}

// Rápidos del picker: los últimos que usó esta persona, completados con los
// default. Se guardan en localStorage, sin sincronizar.
const RECENT_KEY = 'retritoboard:recent-emojis'
const QUICK_COUNT = 8

export function quickEmojis(recent: string[]): string[] {
  const out: string[] = []
  for (const e of [...recent, ...DEFAULT_QUICK]) {
    if (!isEmoji(e) || out.some((o) => normalize(o) === normalize(e))) continue
    out.push(e)
    if (out.length === QUICK_COUNT) break
  }
  return out
}

export function getRecentEmojis(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(arr) ? arr.filter((e): e is string => typeof e === 'string') : []
  } catch {
    return []
  }
}

export function pushRecentEmoji(emoji: string) {
  try {
    const next = [emoji, ...getRecentEmojis().filter((e) => normalize(e) !== normalize(emoji))]
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, QUICK_COUNT)))
  } catch {
    // Sin localStorage (modo privado): los rápidos quedan en los default
  }
}
