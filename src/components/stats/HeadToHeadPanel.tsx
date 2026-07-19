import type { RivalRow } from '../../lib/stats'

interface HeadToHeadPanelProps {
  rows: RivalRow[]
}

export function HeadToHeadPanel({ rows }: HeadToHeadPanelProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-green-300 py-2">Sin rivales todavía.</p>
  }
  return (
    <div className="rounded-xl bg-green-900 border border-green-700 p-3">
      {rows.map((r) => {
        const edge = r.wins - r.losses
        return (
          <div
            key={r.opponentId}
            className="flex items-center gap-2 py-1.5 border-t border-green-800 first:border-t-0"
          >
            <span className="flex-1 truncate">vs {r.opponentName}</span>
            <span className="text-xs text-green-300">{r.gamesAgainst}</span>
            <span
              className={`text-sm font-semibold w-14 text-right ${
                edge > 0 ? 'text-green-300' : edge < 0 ? 'text-red-300' : 'text-green-200'
              }`}
            >
              {r.wins}-{r.losses}
            </span>
          </div>
        )
      })}
    </div>
  )
}
