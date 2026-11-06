import { useMemo, useState } from 'react'
import { teamColor } from '../lib/teamColors'

// One entry per effective score change during the game; the full log lets the
// summary reconstruct how the match unfolded (momentum, streaks, lead changes).
// `scores` is the board right after the change — the ground truth for charts,
// even when the log doesn't cover the whole game (e.g. app updated mid-match).
export interface ScoreEvent {
  team: string
  delta: 1 | -1
  at: number
  scores?: Record<string, number>
}

export interface SummaryTeam {
  key: string
  name: string
  players: string[]
  score: number
}

interface GameSummaryProps {
  teams: SummaryTeam[]
  events: ScoreEvent[]
  winnerName: string
  // Roast line for the loser, shown under the winner headline
  taunt?: string | null
  onNewGame: () => void
  onClose: () => void
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

// Returns one score tuple per step, starting from the state before the first
// logged event. Prefers the per-event score snapshots; for older logs without
// them, replays the deltas from 0-0 and shifts the result so it ends exactly
// at the real final scores (covers games only partially logged).
function buildTimeline(teams: SummaryTeam[], events: ScoreEvent[]): number[][] {
  if (events.length > 0 && events.every(e => e.scores)) {
    const first = events[0]
    const initial = teams.map(t => {
      const s = first.scores![t.key] ?? 0
      return t.key === first.team ? Math.max(0, s - first.delta) : s
    })
    return [initial, ...events.map(e => teams.map(t => e.scores![t.key] ?? 0))]
  }

  const indexByKey = new Map(teams.map((t, i) => [t.key, i]))
  const current = teams.map(() => 0)
  const timeline: number[][] = [[...current]]
  for (const e of events) {
    const i = indexByKey.get(e.team)
    if (i === undefined) continue
    current[i] = Math.max(0, Math.min(30, current[i] + e.delta))
    timeline.push([...current])
  }
  const offsets = teams.map((t, i) => t.score - current[i])
  return timeline.map(step => step.map((s, i) => Math.max(0, s + offsets[i])))
}

interface SummaryStats {
  duration: string | null
  leadChanges: number
  maxLead: { team: number; margin: number } | null
  bestRun: { team: number; length: number } | null
  // Biggest deficit the winner climbed back from: at `step`, `leader` was ahead by `deficit`
  comeback: { deficit: number; step: number; leader: number } | null
}

function computeStats(events: ScoreEvent[], timeline: number[][], teams: SummaryTeam[], winner: number): SummaryStats {
  const duration = events.length >= 2 ? formatDuration(events[events.length - 1].at - events[0].at) : null

  let leadChanges = 0
  let lastLeader: number | null = null
  let maxLead: SummaryStats['maxLead'] = null
  for (const scores of timeline) {
    let top = 0
    for (let j = 1; j < scores.length; j++) if (scores[j] > scores[top]) top = j
    const second = Math.max(...scores.filter((_, j) => j !== top))
    const margin = scores[top] - second
    if (margin > 0) {
      if (lastLeader !== null && lastLeader !== top) leadChanges++
      lastLeader = top
      if (!maxLead || margin > maxLead.margin) maxLead = { team: top, margin }
    }
  }

  const indexByKey = new Map(teams.map((t, i) => [t.key, i]))
  let bestRun: SummaryStats['bestRun'] = null
  let runTeam: string | null = null
  let runLength = 0
  for (const e of events) {
    if (e.delta > 0 && indexByKey.has(e.team)) {
      if (e.team === runTeam) runLength++
      else {
        runTeam = e.team
        runLength = 1
      }
      if (!bestRun || runLength > bestRun.length) bestRun = { team: indexByKey.get(runTeam)!, length: runLength }
    } else {
      runTeam = null
      runLength = 0
    }
  }

  let comeback: SummaryStats['comeback'] = null
  if (winner >= 0) {
    timeline.forEach((scores, step) => {
      let leader = -1
      scores.forEach((sc, j) => {
        if (j !== winner && (leader < 0 || sc > scores[leader])) leader = j
      })
      const deficit = leader >= 0 ? scores[leader] - scores[winner] : 0
      if (deficit > 0 && (!comeback || deficit > comeback.deficit)) comeback = { deficit, step, leader }
    })
  }

  return { duration, leadChanges, maxLead, bestRun, comeback }
}

// Each team's score over the course of the game, one line per team. Lines draw
// in, then the moments that matter pop up: lead changes and the winner's
// biggest comeback.
function ProgressChart({ teams, timeline, winner, comeback }: {
  teams: SummaryTeam[]
  timeline: number[][]
  winner: number
  comeback: SummaryStats['comeback']
}) {
  const W = 300
  const H = 180
  const padL = 16
  const padR = 8
  const padY = 8
  const n = timeline.length
  const px = (i: number) => padL + (i / (n - 1)) * (W - padL - padR)
  const py = (score: number) => padY + (1 - score / 30) * (H - 2 * padY)
  const path = (ti: number) =>
    timeline.map((s, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(s[ti]).toFixed(1)}`).join(' ')

  // Steps where a different team takes the outright lead
  const flips: { step: number; leader: number }[] = []
  let last: number | null = null
  timeline.forEach((scores, step) => {
    const best = Math.max(...scores)
    if (scores.filter(sc => sc === best).length > 1) return
    const top = scores.indexOf(best)
    if (last !== null && last !== top) flips.push({ step, leader: top })
    last = top
  })

  // Winner drawn last so its line sits on top
  const order = teams.map((_, i) => i).sort((a, b) => (a === winner ? 1 : b === winner ? -1 : a - b))
  const winColor = winner >= 0 ? teamColor(winner) : '#fbbf24'
  const cb = comeback && comeback.deficit >= 3 && winner >= 0 ? comeback : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label="Progresión de puntos">
        <defs>
          <linearGradient id="win-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={winColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={winColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 0, 15 (malas to buenas) and 30 guides */}
        {[0, 15, 30].map(v => (
          <g key={v}>
            <line
              x1={padL}
              y1={py(v)}
              x2={W - padR}
              y2={py(v)}
              stroke="#ffffff"
              strokeOpacity={v === 15 ? 0.25 : 0.1}
              strokeWidth={1}
              strokeDasharray={v === 15 ? '4 3' : undefined}
            />
            <text x={0} y={py(v) + 3} fontSize={8} fill="var(--color-green-300)" fillOpacity={0.7}>{v}</text>
          </g>
        ))}

        {winner >= 0 && (
          <path
            className="chart-pop"
            d={`${path(winner)} L${px(n - 1).toFixed(1)},${py(0).toFixed(1)} L${px(0).toFixed(1)},${py(0).toFixed(1)} Z`}
            fill="url(#win-area)"
          />
        )}

        {order.map(ti => (
          <path
            key={teams[ti].key}
            className="chart-line"
            d={path(ti)}
            pathLength={1}
            fill="none"
            stroke={teamColor(ti)}
            strokeWidth={ti === winner ? 3 : 2}
            strokeOpacity={ti === winner ? 1 : 0.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Biggest hole the winner climbed out of */}
        {cb && (
          <g className="chart-pop">
            <line
              x1={px(cb.step)}
              y1={py(timeline[cb.step][cb.leader])}
              x2={px(cb.step)}
              y2={py(timeline[cb.step][winner])}
              stroke="#ffffff"
              strokeOpacity={0.8}
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            <text
              x={px(cb.step) > W * 0.7 ? px(cb.step) - 4 : px(cb.step) + 4}
              y={(py(timeline[cb.step][cb.leader]) + py(timeline[cb.step][winner])) / 2 + 3}
              textAnchor={px(cb.step) > W * 0.7 ? 'end' : 'start'}
              fontSize={10}
              fontWeight={800}
              fill="#ffffff"
            >
              {`−${cb.deficit}`}
            </text>
          </g>
        )}

        {/* Lead changes */}
        {flips.map(f => (
          <circle
            key={f.step}
            className="chart-pop"
            cx={px(f.step)}
            cy={py(timeline[f.step][f.leader])}
            r={3}
            fill="var(--color-green-950)"
            stroke={teamColor(f.leader)}
            strokeWidth={1.5}
          />
        ))}

        {/* Final scores */}
        {teams.map((t, ti) => (
          <circle
            key={t.key}
            className="chart-pop"
            cx={px(n - 1)}
            cy={py(timeline[n - 1][ti])}
            r={ti === winner ? 4 : 3}
            fill={teamColor(ti)}
          />
        ))}
      </svg>
      <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-green-200 mt-1.5">
        {teams.map((t, i) => (
          <span key={t.key} className="flex items-center gap-1 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: teamColor(i) }} />
            <span className="truncate">{t.name}</span>
          </span>
        ))}
        {flips.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-white/70 flex-shrink-0" />
            cambio de líder
          </span>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-green-800/60 rounded-lg px-2.5 py-2">
      <p className="text-[0.65rem] text-green-300 font-semibold">{label}</p>
      <p className="text-sm font-bold truncate" style={color ? { color } : undefined}>{value}</p>
    </div>
  )
}

export function GameSummary({ teams, events, winnerName, taunt, onNewGame, onClose }: GameSummaryProps) {
  // Players often tap repeatedly to skip the win intro; ignore backdrop taps
  // for a moment so those extra taps don't close the summary right away
  const [openedAt] = useState(() => Date.now())
  const closeFromBackdrop = () => {
    if (Date.now() - openedAt > 600) onClose()
  }
  // Stats that belong to a team take that team's colour (the same one its
  // line has in the chart) so everything about a team reads consistently
  const winnerIndex = teams.findIndex(t => t.name === winnerName)
  const winnerColor = winnerIndex >= 0 ? teamColor(winnerIndex) : '#fbbf24'
  const timeline = useMemo(() => buildTimeline(teams, events), [teams, events])
  const stats = useMemo(
    () => computeStats(events, timeline, teams, winnerIndex),
    [events, timeline, teams, winnerIndex],
  )

  const showChart = timeline.length >= 3

  const statCards: { label: string; value: string; color?: string }[] = []
  const hasComeback = !!stats.comeback && stats.comeback.deficit >= 3
  if (stats.comeback && hasComeback) {
    statCards.push({ label: '💪 Remontada', value: `de ${stats.comeback.deficit} abajo`, color: winnerColor })
  }
  if (stats.duration) statCards.push({ label: '⏱ Duración', value: stats.duration })
  if (stats.bestRun) {
    statCards.push({ label: '🔥 Mejor racha', value: `${teams[stats.bestRun.team].name} +${stats.bestRun.length}`, color: teamColor(stats.bestRun.team) })
  }
  if (showChart) statCards.push({ label: '🔄 Cambios de líder', value: `${stats.leadChanges}` })
  // A comeback already tells the biggest-lead story from the winner's side
  if (stats.maxLead && !hasComeback) {
    statCards.push({ label: '📈 Máx. ventaja', value: `${teams[stats.maxLead.team].name} +${stats.maxLead.margin}`, color: teamColor(stats.maxLead.team) })
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeFromBackdrop}>
      <div
        className="modal-card bg-green-900 rounded-xl p-4 max-w-sm w-full border border-green-600 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <span className="trophy text-3xl">🏆</span>
          <h2 className="text-lg font-bold mt-1" style={{ color: winnerColor }}>¡{winnerName} {teams.find(t => t.name === winnerName)?.players.length === 1 ? 'gana' : 'ganan'}!</h2>
          {taunt && <p className="text-yellow-300 font-semibold text-sm mt-1">{taunt}</p>}
        </div>

        {/* Final score */}
        <div className="flex justify-center items-center gap-3 mb-3">
          {teams.map((t, i) => (
            <div key={t.key} className="flex items-center gap-3">
              {i > 0 && <span className="text-green-400 text-sm">—</span>}
              <div className="text-center min-w-0">
                <p className={`text-2xl font-black ${t.name === winnerName ? '' : 'opacity-60'}`} style={{ color: teamColor(i) }}>{t.score}</p>
                <p className="text-[0.65rem] truncate max-w-[5rem]" style={{ color: teamColor(i) }}>{t.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Score progression: each team's climb to 30 */}
        {showChart && (
          <div className="mb-3 bg-green-950/60 rounded-lg p-2.5 border border-green-800">
            <h3 className="text-xs font-semibold text-green-300 mb-1.5">Cómo fue la partida</h3>
            <ProgressChart teams={teams} timeline={timeline} winner={winnerIndex} comeback={stats.comeback} />
          </div>
        )}

        {/* Highlights */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {statCards.map(card => (
              <StatCard key={card.label} label={card.label} value={card.value} color={card.color} />
            ))}
          </div>
        )}

        <button
          onClick={onNewGame}
          className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-green-900 rounded-lg font-bold transition active:scale-[0.98]"
        >
          Nueva Partida
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold text-sm"
        >
          Corregir puntos
        </button>
      </div>
    </div>
  )
}
