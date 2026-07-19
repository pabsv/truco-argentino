import type { PartnershipRow } from '../../lib/stats'

interface PartnershipsPanelProps {
  rows: PartnershipRow[]
}

function Row({ r }: { r: PartnershipRow }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-green-800 first:border-t-0">
      <span className="flex-1 truncate">{r.partnerName}</span>
      <span className="text-xs text-green-300">{r.gamesTogether} juntos</span>
      <span className="text-sm font-semibold w-10 text-right">{Math.round(r.winPct * 100)}%</span>
      <span className="text-xs text-green-300 w-12 text-right">
        {r.wins}-{r.losses}
      </span>
    </div>
  )
}

export function PartnershipsPanel({ rows }: PartnershipsPanelProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-green-300 py-2">
        Sin datos de parejas (jugá partidas 2v2).
      </p>
    )
  }
  // rows already sorted best->worst by win%
  return (
    <div className="rounded-xl bg-green-900 border border-green-700 p-3">
      {rows.map((r) => (
        <Row key={r.partnerId} r={r} />
      ))}
    </div>
  )
}
