import type { ReactNode } from 'react'
import type { RoomUser } from '../lib/types'
import { Search, X } from 'lucide-react'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
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
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-subtle pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar en tarjetas…"
          aria-label="Buscar en tarjetas"
          className={cx(FIELD, 'w-full h-9 pointer-coarse:h-10 pl-9 pr-9 text-sm [&::-webkit-search-cancel-button]:hidden')}
        />
        {search && (
          <IconButton
            label="Limpiar búsqueda"
            size="xs"
            onClick={() => onSearchChange('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            <X />
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
              className="h-8 pl-1 pr-2 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-100 text-meta font-medium flex items-center gap-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition"
              title={`Quitar filtro de ${u.name}`}
            >
              <Avatar name={u.name} />
              {u.name}
              <X className="size-3.5 opacity-60" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Limpiar filtros
        </Button>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
