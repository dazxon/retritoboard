import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, PanelRightClose } from 'lucide-react'
import type { RoomUser } from '../lib/types'
import { AdminBadge } from './ui/AdminBadge'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { PANEL } from './ui/surface'
import { cx } from './ui/cx'

type UserWithId = RoomUser & { id: string }

type Props = {
  users: UserWithId[]
  error: string | null
  adminUid: string
  currentUid: string
  selectedUids: Set<string>
  onToggleUid: (uid: string) => void
}

const ONLINE_WINDOW_MS = 75_000
const COLLAPSED_KEY = 'retritoboard:participants-collapsed'

// Sin preferencia guardada, arranca cerrado en celular y iPad vertical (ahí el
// panel va debajo del tablero y ocupa mucho)
function readCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    if (stored !== null) return stored === '1'
  } catch {
    // ignore
  }
  return window.matchMedia('(max-width: 1023px)').matches
}

export function Participants({
  users,
  error,
  adminUid,
  currentUid,
  selectedUids,
  onToggleUid,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      } catch {
        // ignore
      }
      return !c
    })
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  function isOnline(u: UserWithId) {
    if (u.id === currentUid) return true
    const t = u.lastSeen?.toMillis()
    if (!t) return false
    return now - t < ONLINE_WINDOW_MS
  }

  const sorted = users.slice().sort((a, b) => {
    if (a.id === adminUid) return -1
    if (b.id === adminUid) return 1
    const onlineDiff = (isOnline(b) ? 1 : 0) - (isOnline(a) ? 1 : 0)
    if (onlineDiff !== 0) return onlineDiff
    return a.name.localeCompare(b.name)
  })

  const onlineCount = users.filter(isOnline).length
  const anySelected = selectedUids.size > 0

  // Colapsado: una pastilla con caritas y el conteo, para dejarle el ancho al tablero
  if (collapsed) {
    const faces = sorted.slice(0, 4)
    return (
      <aside className="w-full lg:w-auto flex-shrink-0">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={false}
          aria-label="Mostrar participantes"
          title="Mostrar participantes"
          className={cx(
            PANEL,
            'lg:sticky lg:top-20 w-full lg:w-auto flex lg:flex-col items-center gap-3 lg:gap-2 px-3 py-2 lg:px-2 lg:py-3 text-sm text-ink-muted hover:bg-surface-muted transition',
          )}
        >
          <span className="flex lg:flex-col -space-x-1.5 lg:space-x-0 lg:-space-y-1.5">
            {faces.map((u) => (
              <Avatar key={u.id} name={u.name} size="sm" className="ring-2 ring-surface" />
            ))}
          </span>
          <span className="tabular-nums text-meta font-medium">
            <span className="text-emerald-600 dark:text-emerald-400">{onlineCount}</span>
            <span className="text-ink-subtle mx-0.5">/</span>
            <span>{users.length}</span>
          </span>
          <span className="lg:hidden ml-auto inline-flex items-center gap-1 text-meta">
            Participantes
            <ChevronDown className="size-4" aria-hidden />
          </span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className={cx(PANEL, 'lg:sticky lg:top-20 p-panel')}>
        <div className="flex items-center gap-2 pl-1.5 mb-0.5">
          <h2 className="eyebrow flex-1">Participantes</h2>
          <span className="text-meta tabular-nums text-ink-muted" title="En línea / total">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{onlineCount}</span>
            <span className="text-ink-subtle mx-0.5">/</span>
            {users.length}
          </span>
          <IconButton
            label="Ocultar participantes"
            size="xs"
            aria-expanded={true}
            onClick={toggleCollapsed}
          >
            <PanelRightClose className="hidden lg:block" />
            <ChevronUp className="lg:hidden" />
          </IconButton>
        </div>
        <p className="text-meta text-ink-subtle mb-2 pl-1.5">
          Tocá un nombre para filtrar
        </p>
        {error && (
          <p className="text-meta text-red-600 dark:text-red-400 mb-2 break-all">
            {error}
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {sorted.map((u) => {
            const online = isOnline(u)
            const selected = selectedUids.has(u.id)
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onToggleUid(u.id)}
                  className={cx(
                    'w-full flex items-center gap-2.5 text-left text-sm rounded-control px-1.5 py-1.5 transition',
                    selected
                      ? 'bg-primary-50 dark:bg-primary-950/60 ring-1 ring-inset ring-primary-300 dark:ring-primary-800 text-primary-900 dark:text-primary-100'
                      : 'hover:bg-surface-muted',
                    !selected && (online ? 'text-ink' : 'text-ink-subtle'),
                  )}
                  aria-pressed={selected}
                >
                  <Avatar
                    name={u.name}
                    size="sm"
                    online={online}
                    className={cx(!online && 'opacity-50')}
                  />
                  <span className="truncate min-w-0">{u.name}</span>
                  {u.id === currentUid && (
                    <span className="text-meta text-ink-subtle flex-shrink-0">
                      (vos)
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                    {u.id === adminUid && <AdminBadge />}
                    {selected && (
                      <Check className="size-4 text-primary-600 dark:text-primary-300" aria-hidden />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {anySelected && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => selectedUids.forEach(onToggleUid)}
            className="mt-2 w-full"
          >
            Limpiar selección
          </Button>
        )}
      </div>
    </aside>
  )
}
