// Slack mrkdwn helpers
// Refs: https://api.slack.com/reference/surfaces/formatting
//   *bold*, _italic_, ~strike~, `code`, <url|texto>, listas con prefijo "1. " o "- "
//   (Slack convierte el prefijo a lista nativa al pegar en el composer)

import type { Card } from './types'

type CardWithId = Card & { id: string }

type BuildArgs = {
  roomName: string
  columnTitle: string
  cards: CardWithId[]
}

// Escapa caracteres reservados de mrkdwn dentro del contenido del usuario
// para evitar que se interprete formato no deseado.
function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildSlackActionables({
  roomName,
  columnTitle,
  cards,
}: BuildArgs): string {
  const safeRoom = (roomName || 'Retro').trim()
  const safeCol = (columnTitle || 'Accionables').trim()
  const lines: string[] = []
  lines.push(`*🎯 ${escapeMrkdwn(safeCol)} — ${escapeMrkdwn(safeRoom)}*`)
  lines.push('')
  if (cards.length === 0) {
    lines.push('_Sin accionables todavía._')
  } else {
    cards.forEach((c, i) => {
      const raw = (c.content || '').trim()
      const body = raw ? escapeMrkdwn(raw) : '_(sin texto)_'
      const author = escapeMrkdwn(c.authorName || 'Anónimo')
      lines.push(`${i + 1}. ${body} — _${author}_`)
    })
  }
  return lines.join('\n')
}
