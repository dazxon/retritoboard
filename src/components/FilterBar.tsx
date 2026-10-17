import type { ReactNode } from 'react'
import type { RoomUser } from '../lib/types'
import { IconButton } from './ui/IconButton'
import { FIELD } from './ui/field'
import { cx } from './ui/cx'

type UserWithId = RoomUser & { id: string }

type Props = {
  users: UserWithId[]
  search: string
  onSearchChange: (s: string) => void
  selectedUids: Set<string>
  onToggleUid: (uid: string) => void
  onClearAll: () => void
  // Acciones a la derecha de la barra (p.ej. "+ Columna" para el admin)
  actions?: ReactNode
}

export function FilterBar({
  users,
  search,
  onSearchChange,
  selectedUids,
  onToggleUid,
  onClearAll,
  actions,
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
          className={cx(FIELD, 'w-full pl-9 pr-8 py-2 text-sm')}
        />
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"
          aria-hidden
        >
          🔎
        </span>
        {search && (
          <IconButton
            label="Limpiar búsqueda"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm w-5 h-5 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ✕
          </IconButton>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onToggleUid(u.id)}
              className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200 text-xs font-medium flex items-center gap-1 hover:bg-primary-200 dark:hover:bg-primary-900/60 transition"
              title={`Quitar filtro de ${u.name}`}
            >
              {u.name}
              <span className="text-primary-400 dark:text-primary-500">✕</span>
            </button>
          ))}
        </div>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
        >
          Limpiar filtros
        </button>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
