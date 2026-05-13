import { useMemo, useState } from 'react'
import type { Card, Column } from '../lib/types'
import { getActionColumns } from '../lib/columns'
import { getColor } from '../lib/colors'

type CardWithId = Card & { id: string }

type Props = {
  roomName: string
  columns: Column[]
  cards: CardWithId[]
  revealed: boolean
  currentUid: string
}

type Group = {
  column: Column
  cards: CardWithId[]
}

function buildSlackText(roomName: string, groups: Group[]): string {
  const lines: string[] = []
  const heading = `*🎯 Accionables — ${roomName || 'Retro'}*`
  lines.push(heading)
  groups.forEach((g, gi) => {
    if (groups.length > 1) {
      lines.push('')
      lines.push(`*${g.column.title}*`)
    } else {
      lines.push('')
    }
    g.cards.forEach((c, i) => {
      const text = c.content.trim() || '(sin texto)'
      lines.push(`${i + 1}. ${text} — _${c.authorName}_`)
    })
    if (gi < groups.length - 1) lines.push('')
  })
  return lines.join('\n')
}

export function ActionablesPanel({
  roomName,
  columns,
  cards,
  revealed,
  currentUid,
}: Props) {
  const [copied, setCopied] = useState(false)

  const groups = useMemo<Group[]>(() => {
    const actionCols = getActionColumns(columns).slice().sort((a, b) => a.order - b.order)
    return actionCols.map((col) => {
      const colCards = cards
        .filter((c) => c.columnId === col.id)
        // Si no esta revelado, solo veo las propias (igual que CardView.hidden)
        .filter((c) => revealed || c.authorUid === currentUid)
        .slice()
        .sort((a, b) => a.order - b.order)
      return { column: col, cards: colCards }
    })
  }, [columns, cards, revealed, currentUid])

  if (groups.length === 0) return null

  const totalCards = groups.reduce((acc, g) => acc + g.cards.length, 0)
  const slackText = buildSlackText(roomName, groups)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(slackText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (e) {
      console.error('clipboard write failed', e)
    }
  }

  return (
    <section className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-950/30 dark:to-emerald-950/30">
        <span className="text-2xl" aria-hidden>🎯</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Accionables
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {totalCards} {totalCards === 1 ? 'acción' : 'acciones'} para llevarse de esta retro
          </p>
        </div>
        <button
          type="button"
          onClick={copyToClipboard}
          disabled={totalCards === 0}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white'
          }`}
          title="Copiar al portapapeles en formato Slack"
        >
          {copied ? '✓ Copiado' : '📋 Copiar para Slack'}
        </button>
      </header>

      <div className="p-5 space-y-5">
        {!revealed && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg px-3 py-2">
            En modo escritura solo ves tus accionables. Cuando el admin revele, vas a ver los del equipo.
          </p>
        )}

        {groups.map((g) => {
          const colors = getColor(g.column.color)
          return (
            <div key={g.column.id}>
              {groups.length > 1 && (
                <h3
                  className={`text-sm font-bold uppercase tracking-wide mb-2 ${colors.text}`}
                >
                  {g.column.title}
                </h3>
              )}
              {g.cards.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  Sin accionables todavía.
                </p>
              ) : (
                <ol className="space-y-2">
                  {g.cards.map((c, i) => {
                    const initial = (c.authorName || '?').charAt(0).toUpperCase()
                    return (
                      <li
                        key={c.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                      >
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${colors.badge}`}
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                            {c.content || (
                              <span className="italic text-slate-400">(sin texto)</span>
                            )}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span
                              className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-semibold text-white ${colors.accent}`}
                              aria-hidden
                            >
                              {initial}
                            </span>
                            {c.authorName}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
