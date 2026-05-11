import { useParams, Link } from 'react-router-dom'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-violet-600 hover:underline">
            ← retritoboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Sala {roomId}
          </h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Las columnas y tarjetas aparecen en la Fase 2.
        </div>
      </main>
    </div>
  )
}
