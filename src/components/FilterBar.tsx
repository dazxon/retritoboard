import type { RoomUser } from '../lib/types'

type UserWithId = RoomUser & { id: string }

type Props = {
  users: UserWithId[]
  search: string
  onSearchChange: (s: string) => void
  selectedUids: Set<string>
  onToggleUid: (uid: string) => void
  onClearAll: () => void
}

export function FilterBar({
  users,
  search,
  onSearchChange,
  selectedUids,
  onToggleUid,
  onClearAll,
}: Props) {
  const hasFilter = search.trim() !== '' || selectedUids.size > 0
  const selectedUsers = users.filter((u) => selectedUids.has(u.id))

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar en tarjetas…"
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"
          aria-hidden
        >
          🔎
        </span>
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onToggleUid(u.id)}
              className="px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200 text-xs font-medium flex items-center gap-1 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition"
              title={`Quitar filtro de ${u.name}`}
            >
              {u.name}
              <span className="text-violet-400 dark:text-violet-500">✕</span>
            </button>
          ))}
        </div>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
