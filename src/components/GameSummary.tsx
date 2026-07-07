import { useMemo } from 'react'
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

// Each team's score over the course of the game — one line per team.
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
            stroke={teamColor(ti)}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="flex justify-center gap-3 text-[0.65rem] text-green-200 mt-1">
        {teams.map((t, i) => (
          <span key={t.key} className="flex items-center gap-1 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: teamColor(i) }} />
            <span className="truncate">{t.name}</span>
          </span>
        ))}
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

export function GameSummary({ teams, events, winnerName, onNewGame, onClose }: GameSummaryProps) {
  const timeline = useMemo(() => buildTimeline(teams, events), [teams, events])
  const stats = useMemo(() => computeStats(events, timeline, teams), [events, timeline, teams])

  const showChart = timeline.length >= 3

  // Stats that belong to a team take that team's colour — the same one its
  // line has in the chart — so everything about a team reads consistently
  const winnerIndex = teams.findIndex(t => t.name === winnerName)
  const winnerColor = winnerIndex >= 0 ? teamColor(winnerIndex) : '#fbbf24'

  const statCards: { label: string; value: string; color?: string }[] = []
  if (stats.duration) statCards.push({ label: '⏱ Duración', value: stats.duration })
  if (stats.bestRun) {
    statCards.push({ label: '🔥 Mejor racha', value: `${teams[stats.bestRun.team].name} +${stats.bestRun.length}`, color: teamColor(stats.bestRun.team) })
  }
  if (showChart) statCards.push({ label: '🔄 Cambios de líder', value: `${stats.leadChanges}` })
  if (stats.maxLead) {
    statCards.push({ label: '📈 Máx. ventaja', value: `${teams[stats.maxLead.team].name} +${stats.maxLead.margin}`, color: teamColor(stats.maxLead.team) })
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <span className="trophy text-3xl">🏆</span>
          <h2 className="text-lg font-bold mt-1" style={{ color: winnerColor }}>¡{winnerName} {teams.find(t => t.name === winnerName)?.players.length === 1 ? 'gana' : 'ganan'}!</h2>
        </div>

        {/* Final score */}
        <div className="flex justify-center items-center gap-3 mb-4">
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
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-green-300 mb-1.5">Progresión</h3>
            <ProgressChart teams={teams} timeline={timeline} />
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
