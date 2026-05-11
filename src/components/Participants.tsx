import { useEffect, useState } from 'react'
import type { RoomUser } from '../lib/types'

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

export function Participants({
  users,
  error,
  adminUid,
  currentUid,
  selectedUids,
  onToggleUid,
}: Props) {
  const [now, setNow] = useState(Date.now())

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

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="lg:sticky lg:top-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 font-semibold flex items-center justify-between">
          <span>Participantes</span>
          <span className="text-slate-500 dark:text-slate-400 normal-case font-normal">
            <span className="text-emerald-600 dark:text-emerald-400">{onlineCount}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
            <span>{users.length}</span>
          </span>
        </h2>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">
          Click para filtrar sus tarjetas
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-2 break-all">
            {error}
          </p>
        )}
        <ul className="space-y-0.5">
          {sorted.map((u) => {
            const online = isOnline(u)
            const selected = selectedUids.has(u.id)
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onToggleUid(u.id)}
                  className={`w-full flex items-center justify-between text-left text-sm rounded px-2 py-1.5 transition ${
                    selected
                      ? 'bg-violet-100 dark:bg-violet-900/40 ring-1 ring-inset ring-violet-300 dark:ring-violet-800 text-violet-900 dark:text-violet-100'
                      : online
                        ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        online
                          ? 'bg-emerald-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      title={online ? 'online' : 'away'}
                    />
                    <span className="truncate">{u.name}</span>
                    {u.id === currentUid && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                        (vos)
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {selected && (
                      <span className="text-violet-600 dark:text-violet-300 text-xs">
                        ✓
                      </span>
                    )}
                    {u.id === adminUid && (
                      <span className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-300 font-semibold ml-1">
                        admin
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {anySelected && (
          <button
            type="button"
            onClick={() => selectedUids.forEach(onToggleUid)}
            className="mt-3 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300 underline"
          >
            Limpiar selección
          </button>
        )}
      </div>
    </aside>
  )
}
