import { Crown } from 'lucide-react'

// Marca de quien creó la sala (Home, header y participantes)
export function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-meta font-semibold bg-primary-100 text-primary-700 dark:bg-primary-400/15 dark:text-primary-200 flex-shrink-0">
      <Crown className="size-3" aria-hidden />
      admin
    </span>
  )
}
