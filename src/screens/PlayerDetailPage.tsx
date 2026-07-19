import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { StatCard } from '../components/stats/StatCard'
import { FormPanel } from '../components/stats/FormPanel'
import { PartnershipsPanel } from '../components/stats/PartnershipsPanel'
import { HeadToHeadPanel } from '../components/stats/HeadToHeadPanel'
import { TrendChart } from '../components/stats/TrendChart'
import { RecentGamesList } from '../components/stats/RecentGamesList'
import { useStatsData } from '../hooks/useStatsData'
import {
  applyFilters,
  computeForm,
  computeHeadToHead,
  computeLeaderboard,
  computePartnerships,
  computeTrends,
  playerMap,
} from '../lib/stats'

export function PlayerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { games, players, loading } = useStatsData()

  const pMap = useMemo(() => playerMap(players), [players])
  const player = pMap.get(id)
  const filter = useMemo(() => ({ playerIds: [id] }), [id])

  const row = useMemo(
    () => computeLeaderboard(games, pMap, filter).find((r) => r.playerId === id),
    [games, pMap, filter, id],
  )
  const form = useMemo(() => computeForm(id, games), [id, games])
  const partnerships = useMemo(() => computePartnerships(id, games, pMap), [id, games, pMap])
  const h2h = useMemo(() => computeHeadToHead(id, games, pMap), [id, games, pMap])
  const trends = useMemo(() => computeTrends([id], games, pMap, {}, 'week'), [id, games, pMap])
  const recent = useMemo(() => applyFilters(games, filter), [games, filter])

  const back = (
    <button onClick={() => navigate(-1)} className="text-2xl leading-none px-1" aria-label="Volver">
      ‹
    </button>
  )

  return (
    <PageShell title={player?.name ?? 'Jugador'} back={back}>
      {loading ? (
        <p className="text-sm text-green-300">Cargando…</p>
      ) : !row || row.games === 0 ? (
        <p className="text-sm text-green-300 py-6 text-center">
          {player ? 'Sin partidas registradas para este jugador.' : 'Jugador no encontrado.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Partidas" value={row.games} />
            <StatCard
              label="Victorias"
              value={`${row.wins}-${row.losses}`}
              sub={row.ties ? `${row.ties} emp.` : undefined}
            />
            <StatCard label="% Victorias" value={`${Math.round(row.winPct * 100)}%`} accent />
            <StatCard label="Puntos a favor" value={row.pointsFor} />
            <StatCard label="Prom. puntos" value={row.avgPointsFor.toFixed(1)} />
            <StatCard
              label="Diferencia"
              value={`${row.pointDiff > 0 ? '+' : ''}${row.pointDiff}`}
            />
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">Forma</h2>
            <FormPanel form={form} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">
              Mejores parejas
            </h2>
            <PartnershipsPanel rows={partnerships} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">
              Cara a cara
            </h2>
            <HeadToHeadPanel rows={h2h} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">Tendencia</h2>
            <TrendChart series={trends} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-green-200 uppercase tracking-wide">
              Partidas recientes
            </h2>
            <RecentGamesList games={recent} players={pMap} limit={20} />
          </section>
        </div>
      )}
    </PageShell>
  )
}
