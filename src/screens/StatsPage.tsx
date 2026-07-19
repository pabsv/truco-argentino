import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { FilterBar } from '../components/stats/FilterBar'
import { StatCard } from '../components/stats/StatCard'
import { Leaderboard } from '../components/stats/Leaderboard'
import { TrendChart } from '../components/stats/TrendChart'
import { RecentGamesList } from '../components/stats/RecentGamesList'
import { useStatsData } from '../hooks/useStatsData'
import { deleteGame } from '../lib/games'
import {
  applyFilters,
  computeLeaderboard,
  computeTotals,
  computeTrends,
  playerMap,
  type Bucket,
  type StatsFilters,
} from '../lib/stats'

export function StatsPage() {
  const navigate = useNavigate()
  const { games, players, loading, error, refetch } = useStatsData()
  const [filters, setFilters] = useState<StatsFilters>({})
  const [bucket, setBucket] = useState<Bucket>('week')

  const pMap = useMemo(() => playerMap(players), [players])
  const activePlayers = useMemo(() => players.filter((p) => !p.archivedAt), [players])

  const totals = useMemo(() => computeTotals(games, filters), [games, filters])
  const leaderboard = useMemo(
    () => computeLeaderboard(games, pMap, filters).filter((r) => r.games > 0),
    [games, pMap, filters],
  )
  const filteredGames = useMemo(() => applyFilters(games, filters), [games, filters])

  const trendPlayerIds = useMemo(() => {
    if (filters.playerIds?.length) return filters.playerIds.slice(0, 6)
    return leaderboard.slice(0, 3).map((r) => r.playerId)
  }, [filters.playerIds, leaderboard])

  const trendSeries = useMemo(
    () => computeTrends(trendPlayerIds, games, pMap, filters, bucket),
    [trendPlayerIds, games, pMap, filters, bucket],
  )

  const hasGames = games.length > 0

  return (
    <PageShell title="Estadísticas">
      {loading ? (
        <p className="text-sm text-green-300">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !hasGames ? (
        <div className="text-center py-10 flex flex-col items-center gap-3">
          <p className="text-green-200">Todavía no hay partidas registradas.</p>
          <Link
            to="/new"
            className="px-4 py-2 rounded-lg bg-yellow-500 text-green-950 font-bold"
          >
            Jugar la primera
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <FilterBar players={activePlayers} filters={filters} onChange={setFilters} />

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Partidas" value={totals.completed} accent />
            <StatCard label="Jugadores" value={totals.players} />
            <StatCard label="Abandonadas" value={totals.incomplete} />
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">Ranking</h2>
            <Leaderboard rows={leaderboard} onSelect={(id) => navigate(`/stats/p/${id}`)} />
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">Tendencia</h2>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as Bucket[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBucket(b)}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      bucket === b
                        ? 'bg-green-600 border-green-400 font-semibold'
                        : 'bg-green-900 border-green-700 text-green-300'
                    }`}
                  >
                    {b === 'day' ? 'Día' : b === 'week' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart series={trendSeries} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">
              Partidas recientes
            </h2>
            <RecentGamesList
              games={filteredGames}
              players={pMap}
              limit={15}
              onDelete={async (gid) => {
                if (!window.confirm('¿Eliminar esta partida? No se puede deshacer.')) return
                await deleteGame(gid)
                await refetch()
              }}
            />
          </section>
        </div>
      )}
    </PageShell>
  )
}
