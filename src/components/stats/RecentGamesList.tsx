import type { Player, StatsGame } from '../../lib/types'
import { MODE_LABELS } from '../../lib/types'

interface RecentGamesListProps {
  games: StatsGame[] // any order; rendered newest-first
  players: Map<string, Player>
  limit?: number
  onDelete?: (id: string) => void
}

function teamLabel(
  team: StatsGame['teams'][number],
  players: Map<string, Player>,
): string {
  if (team.playerIds.length) {
    return team.playerIds.map((id) => players.get(id)?.name ?? '¿?').join(' y ')
  }
  return team.name ?? 'Equipo'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentGamesList({ games, players, limit, onDelete }: RecentGamesListProps) {
  const ordered = [...games]
    .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, limit ?? games.length)

  if (ordered.length === 0) {
    return <p className="text-sm text-green-300 py-2">Sin partidas registradas.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {ordered.map((g) => (
        <div key={g.id} className="rounded-lg bg-green-900 border border-green-700 p-2.5">
          <div className="flex items-center gap-2 text-[11px] text-green-300 mb-1">
            <span>{fmtDate(g.playedAt)}</span>
            <span className="px-1.5 rounded bg-green-950/50">{MODE_LABELS[g.mode]}</span>
            {!g.completed && (
              <span className="px-1.5 rounded bg-yellow-500/20 text-yellow-300">abandonada</span>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(g.id)}
                className="ml-auto text-green-400 active:text-red-300"
                aria-label="Eliminar"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {g.teams.map((t) => (
              <div
                key={t.teamIndex}
                className={`flex items-center gap-2 text-sm ${
                  t.isWinner ? 'font-bold text-yellow-400' : 'text-green-100'
                }`}
              >
                <span className="flex-1 truncate">
                  {t.isWinner && '🏆 '}
                  {teamLabel(t, players)}
                </span>
                <span className="tabular-nums">{t.finalScore}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
