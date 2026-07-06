import { useMemo } from 'react'

// One entry per effective score change during the game; the full log lets the
// summary reconstruct how the match unfolded (momentum, streaks, lead changes).
export interface ScoreEvent {
  team: string
  delta: 1 | -1
  at: number
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
  onNewGame: () => void
  onClose: () => void
}

const TEAM_COLORS = ['#fbbf24', '#7dd3fc', '#fb923c']

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

// Replays the event log from 0-0, clamping like the scoreboard does.
// Returns one score tuple per step, starting with the all-zeros state.
function buildTimeline(teams: SummaryTeam[], events: ScoreEvent[]): number[][] {
  const indexByKey = new Map(teams.map((t, i) => [t.key, i]))
  const current = teams.map(() => 0)
  const timeline: number[][] = [[...current]]
  for (const e of events) {
    const i = indexByKey.get(e.team)
    if (i === undefined) continue
    current[i] = Math.max(0, Math.min(30, current[i] + e.delta))
    timeline.push([...current])
  }
  return timeline
}

interface SummaryStats {
  duration: string | null
  leadChanges: number
  maxLead: { team: number; margin: number } | null
  bestRun: { team: number; length: number } | null
}

function computeStats(events: ScoreEvent[], timeline: number[][], teams: SummaryTeam[]): SummaryStats {
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

  return { duration, leadChanges, maxLead, bestRun }
}

// Two-team momentum: score difference over the course of the game, filled
// with each team's color depending on who was ahead.
function MomentumChart({ teams, timeline }: { teams: SummaryTeam[]; timeline: number[][] }) {
  const diffs = timeline.map(s => s[0] - s[1])
  const maxAbs = Math.max(3, ...diffs.map(Math.abs))
  const W = 280
  const H = 110
  const midY = H / 2
  const px = (i: number) => (i / (diffs.length - 1)) * W
  const py = (d: number) => midY - (d / maxAbs) * (midY - 6)

  const areaPath = (clamp: (d: number) => number) =>
    `M 0 ${midY} ` + diffs.map((d, i) => `L ${px(i).toFixed(1)} ${py(clamp(d)).toFixed(1)}`).join(' ') + ` L ${W} ${midY} Z`

  const linePoints = diffs.map((d, i) => `${px(i).toFixed(1)},${py(d).toFixed(1)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Momentum de la partida">
        <path d={areaPath(d => Math.max(0, d))} fill={TEAM_COLORS[0]} opacity={0.35} />
        <path d={areaPath(d => Math.min(0, d))} fill={TEAM_COLORS[1]} opacity={0.35} />
        <line x1={0} y1={midY} x2={W} y2={midY} stroke="#ffffff50" strokeWidth={1} strokeDasharray="3 3" />
        <polyline points={linePoints} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeLinejoin="round" opacity={0.85} />
      </svg>
      <div className="flex justify-between text-[0.65rem] text-green-200 mt-1">
        {teams.slice(0, 2).map((t, i) => (
          <span key={t.key} className="flex items-center gap-1 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[i] }} />
            <span className="truncate">{t.name} {i === 0 ? 'arriba' : 'abajo'}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// Three-team fallback: each team's score over the course of the game.
function ProgressChart({ teams, timeline }: { teams: SummaryTeam[]; timeline: number[][] }) {
  const W = 280
  const H = 110
  const px = (i: number) => (i / (timeline.length - 1)) * W
  const py = (score: number) => H - 4 - (score / 30) * (H - 8)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Progresión de puntos">
        <line x1={0} y1={py(15)} x2={W} y2={py(15)} stroke="#ffffff30" strokeWidth={1} strokeDasharray="3 3" />
        {teams.map((t, ti) => (
          <polyline
            key={t.key}
            points={timeline.map((s, i) => `${px(i).toFixed(1)},${py(s[ti]).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={TEAM_COLORS[ti % TEAM_COLORS.length]}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="flex justify-center gap-3 text-[0.65rem] text-green-200 mt-1">
        {teams.map((t, i) => (
          <span key={t.key} className="flex items-center gap-1 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }} />
            <span className="truncate">{t.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-green-800/60 rounded-lg px-2.5 py-2">
      <p className="text-[0.65rem] text-green-300 font-semibold">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  )
}

export function GameSummary({ teams, events, winnerName, onNewGame, onClose }: GameSummaryProps) {
  const timeline = useMemo(() => buildTimeline(teams, events), [teams, events])
  const stats = useMemo(() => computeStats(events, timeline, teams), [events, timeline, teams])

  // If the log doesn't reproduce the final scores (e.g. a game started before
  // this feature existed), the reconstructed momentum would be wrong — skip it.
  const finalStep = timeline[timeline.length - 1]
  const consistent = teams.every((t, i) => finalStep[i] === t.score)
  const showChart = consistent && timeline.length >= 3

  const statCards: { label: string; value: string }[] = []
  if (stats.duration) statCards.push({ label: '⏱ Duración', value: stats.duration })
  if (consistent && stats.bestRun) {
    statCards.push({ label: '🔥 Mejor racha', value: `${teams[stats.bestRun.team].name} +${stats.bestRun.length}` })
  }
  if (consistent) statCards.push({ label: '🔄 Cambios de líder', value: `${stats.leadChanges}` })
  if (consistent && stats.maxLead) {
    statCards.push({ label: '📈 Máx. ventaja', value: `${teams[stats.maxLead.team].name} +${stats.maxLead.margin}` })
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <span className="trophy text-3xl">🏆</span>
          <h2 className="text-lg font-bold text-yellow-400 mt-1">¡{winnerName} {teams.find(t => t.name === winnerName)?.players.length === 1 ? 'gana' : 'ganan'}!</h2>
        </div>

        {/* Final score */}
        <div className="flex justify-center items-center gap-3 mb-4">
          {teams.map((t, i) => (
            <div key={t.key} className="flex items-center gap-3">
              {i > 0 && <span className="text-green-400 text-sm">—</span>}
              <div className="text-center min-w-0">
                <p className={`text-2xl font-black ${t.name === winnerName ? 'text-yellow-400' : 'text-green-100'}`}>{t.score}</p>
                <p className="text-[0.65rem] text-green-300 truncate max-w-[5rem]">{t.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Momentum */}
        {showChart && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-green-300 mb-1.5">Momentum</h3>
            {teams.length === 2
              ? <MomentumChart teams={teams} timeline={timeline} />
              : <ProgressChart teams={teams} timeline={timeline} />}
          </div>
        )}

        {/* Highlights */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {statCards.map(card => (
              <StatCard key={card.label} label={card.label} value={card.value} />
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
