import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { RoomUser } from '../lib/types'

type UserWithId = RoomUser & { id: string }

type Props = {
  roomId: string
  adminUid: string
  currentUid: string
}

const ONLINE_WINDOW_MS = 75_000

export function Participants({ roomId, adminUid, currentUid }: Props) {
  const [users, setUsers] = useState<UserWithId[]>([])
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'rooms', roomId, 'users'),
      (snap) => {
        setError(null)
        setUsers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as RoomUser) })),
        )
      },
      (err) => {
        console.error('Participants subscribe error', err)
        setError(err.message)
      },
    )
    return unsub
  }, [roomId])

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

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="lg:sticky lg:top-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3 font-semibold flex items-center justify-between">
          <span>Participantes</span>
          <span className="text-slate-500 dark:text-slate-400 normal-case font-normal">
            <span className="text-emerald-600 dark:text-emerald-400">{onlineCount}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
            <span>{users.length}</span>
          </span>
        </h2>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-2 break-all">
            {error}
          </p>
        )}
        <ul className="space-y-1.5">
          {sorted.map((u) => {
            const online = isOnline(u)
            return (
              <li
                key={u.id}
                className={`flex items-center justify-between text-sm ${
                  online
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={online ? 'online' : 'away'}
                  />
                  <span className="truncate">{u.name}</span>
                  {u.id === currentUid && (
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      (vos)
                    </span>
                  )}
                </span>
                {u.id === adminUid && (
                  <span className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-300 font-semibold flex-shrink-0 ml-1">
                    admin
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
