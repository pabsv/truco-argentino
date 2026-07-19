import { useMemo, useState } from 'react'
import type { LeaderboardRow } from '../../lib/stats'

interface LeaderboardProps {
  rows: LeaderboardRow[]
  onSelect: (playerId: string) => void
}

type SortKey = 'winPct' | 'games' | 'wins' | 'pointDiff'

const COLS: { key: SortKey; label: string }[] = [
  { key: 'games', label: 'J' },
  { key: 'wins', label: 'G' },
  { key: 'winPct', label: '%' },
  { key: 'pointDiff', label: 'Dif' },
]

export function Leaderboard({ rows, onSelect }: LeaderboardProps) {
  const [sort, setSort] = useState<SortKey>('winPct')

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      if (sort === 'winPct') return b.winPct - a.winPct || b.wins - a.wins
      if (sort === 'games') return b.games - a.games
      if (sort === 'wins') return b.wins - a.wins
      return b.pointDiff - a.pointDiff
    })
    return copy
  }, [rows, sort])

  if (rows.length === 0) {
    return <p className="text-sm text-green-300 py-4 text-center">Sin partidas para mostrar.</p>
  }

  return (
    <div className="rounded-xl overflow-hidden border border-green-700">
      <div className="grid grid-cols-[1.5rem_1fr_2rem_2rem_3rem_3rem] gap-1 bg-green-950/50 px-2 py-1.5 text-[11px] uppercase tracking-wide text-green-300">
        <span>#</span>
        <span>Jugador</span>
        {COLS.map((c) => (
          <button
            key={c.key}
            onClick={() => setSort(c.key)}
            className={`text-right ${sort === c.key ? 'text-yellow-400 font-bold' : ''}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {sorted.map((r, i) => (
        <button
          key={r.playerId}
          onClick={() => onSelect(r.playerId)}
          className="grid grid-cols-[1.5rem_1fr_2rem_2rem_3rem_3rem] gap-1 px-2 py-2 items-center text-sm border-t border-green-800 w-full text-left active:bg-green-800/50 bg-green-900"
        >
          <span className={`font-bold ${i < 3 ? 'text-yellow-400' : 'text-green-400'}`}>
            {i + 1}
          </span>
          <span className="truncate">
            {r.name}
            {r.archived && <span className="ml-1 text-[10px] text-green-500">·arch</span>}
          </span>
          <span className="text-right text-green-200">{r.games}</span>
          <span className="text-right text-green-200">{r.wins}</span>
          <span className="text-right font-semibold">{Math.round(r.winPct * 100)}</span>
          <span
            className={`text-right ${r.pointDiff > 0 ? 'text-green-300' : r.pointDiff < 0 ? 'text-red-300' : 'text-green-400'}`}
          >
            {r.pointDiff > 0 ? '+' : ''}
            {r.pointDiff}
          </span>
        </button>
      ))}
    </div>
  )
}
