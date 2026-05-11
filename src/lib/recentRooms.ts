export type RecentRoom = {
  roomId: string
  name: string
  lastVisitAt: number
  isAdmin: boolean
}

const KEY = 'retritoboard:recent-rooms'
const MAX = 10

export function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return (arr as RecentRoom[])
      .filter(
        (r): r is RecentRoom =>
          !!r &&
          typeof r.roomId === 'string' &&
          typeof r.name === 'string' &&
          typeof r.lastVisitAt === 'number' &&
          typeof r.isAdmin === 'boolean',
      )
      .sort((a, b) => b.lastVisitAt - a.lastVisitAt)
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function addRecentRoom(room: RecentRoom) {
  try {
    const existing = getRecentRooms().filter((r) => r.roomId !== room.roomId)
    const next = [room, ...existing].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage lleno o bloqueado: ignorar
  }
}

export function removeRecentRoom(roomId: string) {
  try {
    const next = getRecentRooms().filter((r) => r.roomId !== roomId)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function clearRecentRooms() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'ahora'
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`
  if (diff < 7 * 86_400_000) return `hace ${Math.floor(diff / 86_400_000)} d`
  return new Date(ms).toLocaleDateString()
}
