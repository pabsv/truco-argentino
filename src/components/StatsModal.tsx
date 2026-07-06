import { useEffect, useMemo, useState } from 'react'
import { fetchAllGames, loadGroupGames, type GameMode, type StoredGame } from '../lib/store'

const MODE_LABELS: Record<GameMode, string> = {
  '1v1': '1 vs 1',
  '2v2': 'Equipos',
  'free-for-all': '3 jugadores',
}

const FILTERS: { key: 'all' | GameMode; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: '1v1', label: '1v1' },
  { key: '2v2', label: 'Equipos' },
  { key: 'free-for-all', label: '3 jug.' },
]

interface PlayerStats {
  name: string
  played: number
  wins: number
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  const [games, setGames] = useState<StoredGame[]>(loadGroupGames)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | GameMode>('all')

  useEffect(() => {
    let cancelled = false
    fetchAllGames().then(all => {
      if (!cancelled) {
        setGames(all)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(
    () => games.filter(g => filter === 'all' || g.mode === filter),
    [games, filter],
  )
  const completed = useMemo(() => filtered.filter(g => g.completed && g.winner), [filtered])
  const abandoned = filtered.length - completed.length
  const unsyncedCount = games.filter(g => !g.synced).length

  const playerStats = useMemo(() => {
    const stats = new Map<string, PlayerStats>()
    for (const game of completed) {
      for (const team of game.teams) {
        for (const player of team.players) {
          const s = stats.get(player) ?? { name: player, played: 0, wins: 0 }
          s.played += 1
          if (team.name === game.winner) s.wins += 1
          stats.set(player, s)
        }
      }
    }
    return [...stats.values()].sort((a, b) => b.wins - a.wins || b.played - a.played)
  }, [completed])

  const recent = useMemo(() => [...filtered].reverse().slice(0, 10), [filtered])

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-3 text-center">Estadísticas</h2>

        {/* Mode filter */}
        <div className="flex gap-1.5 mb-4">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition ${
                filter === f.key
                  ? 'bg-yellow-500 text-green-900 border-yellow-400'
                  : 'bg-green-800 border-green-700 hover:bg-green-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-green-200 mb-4 text-center">
          {completed.length} {completed.length === 1 ? 'partida terminada' : 'partidas terminadas'}
          {abandoned > 0 && <> · {abandoned} sin terminar</>}
        </p>

        {/* Wins per player */}
        {playerStats.length > 0 ? (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-green-300 text-xs">
                <th className="text-left font-semibold pb-1">Jugador</th>
                <th className="text-center font-semibold pb-1">PJ</th>
                <th className="text-center font-semibold pb-1">PG</th>
                <th className="text-right font-semibold pb-1">%</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map(p => (
                <tr key={p.name} className="border-t border-green-800">
                  <td className="py-1.5 font-semibold truncate max-w-[8rem]">{p.name}</td>
                  <td className="py-1.5 text-center">{p.played}</td>
                  <td className="py-1.5 text-center text-yellow-400 font-semibold">{p.wins}</td>
                  <td className="py-1.5 text-right">{Math.round((p.wins / p.played) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-green-300 mb-4 text-center">
            {loading ? 'Cargando…' : 'Todavía no hay partidas con jugadores asignados. Tocá el nombre de un equipo para elegir quiénes juegan.'}
          </p>
        )}

        {/* Recent games */}
        {recent.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-green-300 mb-1.5">Últimas partidas</h3>
            <ul className="space-y-1.5">
              {recent.map(game => (
                <li key={game.id} className="text-xs bg-green-800/60 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-green-300 flex-shrink-0">
                      {new Date(game.playedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-green-400 flex-shrink-0">{MODE_LABELS[game.mode]}</span>
                    {!game.completed && <span className="text-orange-300 flex-shrink-0">sin terminar</span>}
                  </div>
                  <div className="mt-0.5">
                    {game.teams.map((team, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-green-400"> — </span>}
                        <span className={team.name === game.winner ? 'text-yellow-400 font-semibold' : ''}>
                          {team.name} {team.score}
                          {team.name === game.winner && ' 🏆'}
                        </span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unsyncedCount > 0 && (
          <p className="text-xs text-orange-300 mb-3 text-center">
            {unsyncedCount} {unsyncedCount === 1 ? 'partida pendiente' : 'partidas pendientes'} de sincronizar
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
