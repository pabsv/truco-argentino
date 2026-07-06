import { useState, useEffect, useRef } from 'react'
import { useWakeLock } from './hooks/useWakeLock'
import { TeamPicker } from './components/TeamPicker'
import { StatsModal } from './components/StatsModal'
import { GameSummary, type ScoreEvent } from './components/GameSummary'
import {
  addPlayer,
  fetchPlayers,
  getGroupId,
  loadPlayers,
  newId,
  recordGame,
  removePlayer,
  setGroupId,
  syncGames,
  type GameMode,
  type GameTeam,
} from './lib/store'

const WINNING_SCORE = 30

type TeamKey = 'nosotros' | 'ellos' | 'otros'

function loadTeamPlayers(key: TeamKey): string[] {
  try {
    const raw = localStorage.getItem(`truco-${key}-players`)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function loadEvents(): ScoreEvent[] {
  try {
    const raw = localStorage.getItem('truco-game-events')
    return raw ? (JSON.parse(raw) as ScoreEvent[]) : []
  } catch {
    return []
  }
}

function App() {
  const [nosotros, setNosotros] = useState(() => {
    const saved = localStorage.getItem('truco-nosotros')
    return saved ? parseInt(saved, 10) : 0
  })
  const [ellos, setEllos] = useState(() => {
    const saved = localStorage.getItem('truco-ellos')
    return saved ? parseInt(saved, 10) : 0
  })
  const [otros, setOtros] = useState(() => {
    const saved = localStorage.getItem('truco-otros')
    return saved ? parseInt(saved, 10) : 0
  })
  const [threePlayerMode, setThreePlayerMode] = useState(() => {
    return localStorage.getItem('truco-three-player') === 'true'
  })
  const [nosotrosName, setNosotrosName] = useState(() => localStorage.getItem('truco-nosotros-name') || 'Nosotros')
  const [ellosName, setEllosName] = useState(() => localStorage.getItem('truco-ellos-name') || 'Ellos')
  const [otrosName, setOtrosName] = useState(() => localStorage.getItem('truco-otros-name') || 'Otros')
  const [nosotrosPlayers, setNosotrosPlayers] = useState<string[]>(() => loadTeamPlayers('nosotros'))
  const [ellosPlayers, setEllosPlayers] = useState<string[]>(() => loadTeamPlayers('ellos'))
  const [otrosPlayers, setOtrosPlayers] = useState<string[]>(() => loadTeamPlayers('otros'))
  const [presets, setPresets] = useState<string[]>(loadPlayers)
  const [groupId, setGroupIdState] = useState<string>(getGroupId)
  const [currentGameId, setCurrentGameId] = useState<string | null>(() => localStorage.getItem('truco-game-id'))
  const [pickerTeam, setPickerTeam] = useState<TeamKey | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // Point-by-point log of the current game, used for the end-of-game summary
  const [events, setEvents] = useState<ScoreEvent[]>(loadEvents)
  const [summaryDismissed, setSummaryDismissed] = useState(false)

  // Streak: consecutive quick taps on the same team trigger a celebration
  const streakRef = useRef<{ team: string | null; count: number; last: number }>({ team: null, count: 0, last: 0 })
  const [streak, setStreak] = useState<{ team: string; count: number; id: number } | null>(null)

  useEffect(() => {
    if (!streak) return
    const timer = setTimeout(() => setStreak(null), 1200)
    return () => clearTimeout(timer)
  }, [streak])

  useWakeLock()

  // Push any games queued while offline and refresh player presets from Supabase
  useEffect(() => {
    void syncGames()
    fetchPlayers().then(setPresets)
  }, [])

  useEffect(() => {
    localStorage.setItem('truco-nosotros', nosotros.toString())
    localStorage.setItem('truco-ellos', ellos.toString())
    localStorage.setItem('truco-otros', otros.toString())
    localStorage.setItem('truco-three-player', threePlayerMode.toString())
  }, [nosotros, ellos, otros, threePlayerMode])

  useEffect(() => {
    localStorage.setItem('truco-nosotros-name', nosotrosName)
    localStorage.setItem('truco-ellos-name', ellosName)
    localStorage.setItem('truco-otros-name', otrosName)
  }, [nosotrosName, ellosName, otrosName])

  useEffect(() => {
    localStorage.setItem('truco-nosotros-players', JSON.stringify(nosotrosPlayers))
    localStorage.setItem('truco-ellos-players', JSON.stringify(ellosPlayers))
    localStorage.setItem('truco-otros-players', JSON.stringify(otrosPlayers))
  }, [nosotrosPlayers, ellosPlayers, otrosPlayers])

  useEffect(() => {
    if (currentGameId) localStorage.setItem('truco-game-id', currentGameId)
    else localStorage.removeItem('truco-game-id')
  }, [currentGameId])

  useEffect(() => {
    if (events.length > 0) localStorage.setItem('truco-game-events', JSON.stringify(events))
    else localStorage.removeItem('truco-game-events')
  }, [events])

  const teams: { key: TeamKey; name: string; players: string[]; score: number }[] = [
    { key: 'nosotros', name: nosotrosName, players: nosotrosPlayers, score: nosotros },
    { key: 'ellos', name: ellosName, players: ellosPlayers, score: ellos },
    ...(threePlayerMode ? [{ key: 'otros' as TeamKey, name: otrosName, players: otrosPlayers, score: otros }] : []),
  ]

  const winnerTeam = teams.find(t => t.score >= WINNING_SCORE) ?? null
  const winner = winnerTeam?.name ?? null

  const saveCurrentGame = (completed: boolean) => {
    const id = currentGameId ?? newId()
    if (!currentGameId) setCurrentGameId(id)
    const gameTeams: GameTeam[] = teams.map(({ name, players, score }) => ({ name, players, score }))
    const mode: GameMode = threePlayerMode
      ? 'free-for-all'
      : gameTeams.every(t => t.players.length === 1) ? '1v1' : '2v2'
    recordGame({
      id,
      playedAt: new Date().toISOString(),
      mode,
      teams: gameTeams,
      winner: completed ? winner : null,
      completed,
    })
  }

  // Record the game as soon as someone reaches 30, and keep the record
  // up to date if scores get corrected while the winner banner is showing
  useEffect(() => {
    if (winner) saveCurrentGame(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, nosotros, ellos, otros])

  // Open the end-of-game summary whenever a winner is decided
  useEffect(() => {
    if (winner) setSummaryDismissed(false)
  }, [winner])

  const updateScore = (team: 'nosotros' | 'ellos' | 'otros', delta: number) => {
    // Log the change only if it actually moves the score (clamped at 0 and 30)
    const current = team === 'nosotros' ? nosotros : team === 'ellos' ? ellos : otros
    if (Math.max(0, Math.min(30, current + delta)) !== current) {
      setEvents(prev => [...prev, { team, delta: delta > 0 ? 1 : -1, at: Date.now() }])
    }

    if (team === 'nosotros') {
      setNosotros(prev => Math.max(0, Math.min(30, prev + delta)))
    } else if (team === 'ellos') {
      setEllos(prev => Math.max(0, Math.min(30, prev + delta)))
    } else {
      setOtros(prev => Math.max(0, Math.min(30, prev + delta)))
    }

    const now = Date.now()
    const s = streakRef.current
    if (delta > 0) {
      if (s.team === team && now - s.last < 2000) {
        s.count += 1
      } else {
        s.team = team
        s.count = 1
      }
      s.last = now
      if (s.count >= 3) setStreak({ team, count: s.count, id: now })
    } else {
      // A correction breaks the streak
      s.team = null
      s.count = 0
      setStreak(prev => (prev?.team === team ? null : prev))
    }

    if (navigator.vibrate) navigator.vibrate(10)
  }

  const resetGame = () => {
    // A game abandoned mid-play still gets saved (as unfinished)
    const hasPoints = teams.some(t => t.score > 0)
    if (!winner && hasPoints) {
      saveCurrentGame(false)
    }
    setCurrentGameId(null)
    setNosotros(0)
    setEllos(0)
    setOtros(0)
    setEvents([])
    setSummaryDismissed(false)
    streakRef.current = { team: null, count: 0, last: 0 }
    setStreak(null)
    localStorage.removeItem('truco-nosotros')
    localStorage.removeItem('truco-ellos')
    localStorage.removeItem('truco-otros')
  }

  const applyTeam = (team: TeamKey, name: string, players: string[]) => {
    if (team === 'nosotros') {
      setNosotrosName(name)
      setNosotrosPlayers(players)
    } else if (team === 'ellos') {
      setEllosName(name)
      setEllosPlayers(players)
    } else {
      setOtrosName(name)
      setOtrosPlayers(players)
    }
  }

  const pickerDefaults: Record<TeamKey, { defaultName: string; name: string; players: string[] }> = {
    nosotros: { defaultName: 'Nosotros', name: nosotrosName, players: nosotrosPlayers },
    ellos: { defaultName: 'Ellos', name: ellosName, players: ellosPlayers },
    otros: { defaultName: 'Otros', name: otrosName, players: otrosPlayers },
  }

  const joinGroup = (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (normalized === '' || normalized === groupId) return
    setGroupIdState(setGroupId(normalized))
    setPresets([])
    fetchPlayers().then(setPresets)
  }

  return (
    <div className="app-fade h-dvh bg-green-800 flex flex-col text-white overflow-hidden touch-none">
      {/* Header with safe area for notch */}
      <header className="bg-green-900 px-3 border-b border-green-700 flex-shrink-0 flex items-center justify-between" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        <button
          onClick={() => setShowStats(true)}
          aria-label="Estadísticas"
          className="w-7 h-7 text-sm rounded-full bg-green-600 border border-green-500 flex items-center justify-center flex-shrink-0"
        >
          📊
        </button>
        <div className="flex items-center gap-2 py-1">
          <img src="/anchobasto.jpg" alt="Ancho de Basto" className="h-8 w-auto rounded" />
          <h1 className="text-lg font-bold tracking-wide">Truco</h1>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="w-7 h-7 text-xs font-bold rounded-full bg-green-600 border border-green-500 flex items-center justify-center flex-shrink-0"
        >
          ?
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Score panels side by side */}
        <div className="flex-1 flex min-h-0">
          {/* Nosotros */}
          <div className="flex-1 flex flex-col border-r border-green-700 min-h-0">
            <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
              <TeamNameButton name={nosotrosName} onClick={() => setPickerTeam('nosotros')} />
            </div>
            <ScorePanel
              score={nosotros}
              onIncrement={() => updateScore('nosotros', 1)}
              onDecrement={() => updateScore('nosotros', -1)}
              compact={threePlayerMode}
              streak={streak?.team === 'nosotros' ? streak : null}
            />
          </div>

          {/* Ellos */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
              <TeamNameButton name={ellosName} onClick={() => setPickerTeam('ellos')} />
            </div>
            <ScorePanel
              score={ellos}
              onIncrement={() => updateScore('ellos', 1)}
              onDecrement={() => updateScore('ellos', -1)}
              compact={threePlayerMode}
              streak={streak?.team === 'ellos' ? streak : null}
            />
          </div>

          {/* Otros (3-player mode) */}
          {threePlayerMode && (
            <div className="panel-slide-in flex-1 flex flex-col border-l border-green-700 min-h-0">
              <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
                <TeamNameButton name={otrosName} onClick={() => setPickerTeam('otros')} />
              </div>
              <ScorePanel
                score={otros}
                onIncrement={() => updateScore('otros', 1)}
                onDecrement={() => updateScore('otros', -1)}
                compact={threePlayerMode}
                streak={streak?.team === 'otros' ? streak : null}
              />
            </div>
          )}
        </div>

        {/* Reset button with safe area for home indicator */}
        <div className="px-3 pt-3 bg-green-900 border-t border-green-700 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={resetGame}
            className="w-full py-2.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold transition active:scale-[0.98]"
          >
            Nueva Partida
          </button>
        </div>
      </main>

      {/* Winner celebration */}
      {winner && <Confetti />}

      {/* End-of-game summary with momentum and highlights */}
      {winner && !summaryDismissed && (
        <GameSummary
          teams={teams}
          events={events}
          winnerName={winner}
          onNewGame={resetGame}
          onClose={() => setSummaryDismissed(true)}
        />
      )}

      {/* Compact banner while correcting scores — tap to reopen the summary */}
      {winner && summaryDismissed && (
        <div className="fixed left-4 right-4 z-50" style={{ top: 'calc(env(safe-area-inset-top) + 3rem)' }}>
          <button
            onClick={() => setSummaryDismissed(false)}
            className="winner-banner w-full bg-yellow-500 text-green-900 rounded-lg px-4 py-2 text-center font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <span className="trophy">🏆</span>
            <span>¡{winner} {winnerTeam && winnerTeam.players.length === 1 ? 'gana' : 'ganan'}!</span>
            <span className="text-xs font-semibold opacity-70">Ver resumen</span>
          </button>
        </div>
      )}

      {/* Team picker (presets + custom name) */}
      {pickerTeam && (
        <TeamPicker
          defaultName={pickerDefaults[pickerTeam].defaultName}
          currentName={pickerDefaults[pickerTeam].name}
          currentPlayers={pickerDefaults[pickerTeam].players}
          presets={presets}
          onAddPreset={name => setPresets(addPlayer(name))}
          onRemovePreset={name => setPresets(removePlayer(name))}
          onApply={(name, players) => applyTeam(pickerTeam, name, players)}
          onClose={() => setPickerTeam(null)}
        />
      )}

      {/* Stats modal */}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}

      {/* Info modal */}
      {showInfo && (
        <InfoModal
          onClose={() => setShowInfo(false)}
          threePlayerMode={threePlayerMode}
          onToggleThreePlayer={() => setThreePlayerMode(prev => !prev)}
          groupId={groupId}
          onJoinGroup={joinGroup}
        />
      )}
    </div>
  )
}

function TeamNameButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <h2
      onClick={onClick}
      className="text-base font-semibold cursor-pointer truncate px-2"
    >
      {name}
    </h2>
  )
}

interface ScorePanelProps {
  score: number
  onIncrement: () => void
  onDecrement: () => void
  compact?: boolean
  streak?: { count: number; id: number } | null
}

function ScorePanel({ score, onIncrement, onDecrement, compact = false, streak = null }: ScorePanelProps) {
  const handleTap = () => {
    if (score < 30) {
      onIncrement()
    }
  }

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'
  const buttonGap = compact ? 'gap-2' : 'gap-3'

  return (
    <div className="relative flex-1 flex flex-col items-center p-2 min-h-0">
      {streak && <StreakBadge key={streak.id} count={streak.count} />}
      {/* Match boxes display - tappable to increment */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer active:opacity-80 w-full"
        onClick={handleTap}
      >
        <MatchBoxes score={score} />
      </div>

      {/* Increment/Decrement buttons */}
      <div className={`flex ${buttonGap} flex-shrink-0 pt-2`}>
        <button
          onClick={onDecrement}
          disabled={score === 0}
          className={`${buttonSize} font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          −
        </button>
        <button
          onClick={onIncrement}
          disabled={score >= 30}
          className={`${buttonSize} font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function StreakBadge({ count }: { count: number }) {
  const label =
    count >= 7 ? '🚀 ¡Qué paliza!' :
    count >= 5 ? '💥 ¡Vamooo!' :
    count >= 4 ? '🔥🔥' : '🔥'

  return (
    <div className="streak-pop pointer-events-none absolute top-1/4 left-1/2 z-30 flex flex-col items-center bg-green-950/85 rounded-2xl px-4 py-2 border border-yellow-500/40 shadow-lg">
      <span className="text-4xl font-black text-yellow-400 drop-shadow-lg">+{count}</span>
      <span className="text-lg font-bold whitespace-nowrap drop-shadow">{label}</span>
    </div>
  )
}

function MatchBoxes({ score }: { score: number }) {
  const malasScore = Math.min(score, 15)
  const buenasScore = Math.max(0, score - 15)

  return (
    <div className="flex flex-col items-center gap-1 flex-1 justify-center">
      {/* Malas boxes (0-15) - top to bottom */}
      {[0, 1, 2].map(boxIndex => (
        <MatchBox
          key={`malas-${boxIndex}`}
          points={Math.max(0, Math.min(5, malasScore - boxIndex * 5))}
          active={true}
        />
      ))}

      {/* Horizontal divider for 15 */}
      <div className="w-16 h-0.5 bg-yellow-500/60 my-1 rounded" />

      {/* Buenas boxes (15-30) - top to bottom */}
      {[0, 1, 2].map(boxIndex => (
        <MatchBox
          key={`buenas-${boxIndex}`}
          points={Math.max(0, Math.min(5, buenasScore - boxIndex * 5))}
          active={score >= 15}
        />
      ))}
    </div>
  )
}

function MatchBox({ points, active }: { points: number; active: boolean }) {
  const size = 56
  const strokeWidth = 4
  const matchColor = active ? '#fbbf24' : '#ffffff30'

  const pad = 6

  const matchLines: [number, number, number, number][] = [
    [pad, pad, pad, size - pad],               // left
    [pad, pad, size - pad, pad],               // top
    [size - pad, pad, size - pad, size - pad], // right
    [pad, size - pad, size - pad, size - pad], // bottom
    [pad, pad, size - pad, size - pad],        // diagonal
  ]

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      {/* Box border for reference */}
      <rect
        x={pad} y={pad}
        width={size - pad * 2} height={size - pad * 2}
        fill="none"
        stroke="#ffffff20"
        strokeWidth={1}
        rx={3}
      />

      {/* Matches: left, top, right, bottom, diagonal — each draws in when it appears */}
      {matchLines.slice(0, points).map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1}
          x2={x2} y2={y2}
          pathLength={1}
          className="match-line"
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#fde68a', '#4ade80', '#ffffff']

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => {
        const left = (i * 37) % 100
        const delay = ((i * 53) % 25) / 10
        const duration = 2.5 + ((i * 29) % 20) / 10
        const width = 6 + (i % 3) * 3
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              width: `${width}px`,
              height: `${width * 0.5}px`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        )
      })}
    </div>
  )
}

interface InfoModalProps {
  onClose: () => void
  threePlayerMode: boolean
  onToggleThreePlayer: () => void
  groupId: string
  onJoinGroup: (code: string) => void
}

function InfoModal({ onClose, threePlayerMode, onToggleThreePlayer, groupId, onJoinGroup }: InfoModalProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard?.writeText(groupId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  const submitJoin = () => {
    onJoinGroup(joinCode)
    setJoinCode('')
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 3-player toggle */}
        <div className="mb-4 pb-3 border-b border-green-700">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-semibold">3 players (Otros)</span>
            <input
              type="checkbox"
              checked={threePlayerMode}
              onChange={onToggleThreePlayer}
              className="w-5 h-5 accent-yellow-500"
            />
          </label>
        </div>

        {/* Group code: shared stats across devices, isolation between friend groups */}
        <div className="mb-4 pb-3 border-b border-green-700">
          <p className="font-semibold mb-1">Grupo</p>
          <p className="text-xs text-green-200 mb-2">
            Tus partidas y jugadores se guardan en este grupo. Compartí el código para ver las mismas estadísticas en otro teléfono.
          </p>
          <button
            onClick={copyCode}
            className="w-full py-1.5 mb-2 bg-green-800 border border-green-600 rounded-lg font-mono text-sm tracking-widest active:bg-green-700"
          >
            {copied ? '¡Copiado!' : groupId}
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') submitJoin() }}
              placeholder="Código de otro grupo"
              maxLength={12}
              autoCapitalize="characters"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-green-800 border border-green-600 rounded-lg outline-none focus:border-yellow-500 font-mono uppercase"
            />
            <button
              onClick={submitJoin}
              disabled={joinCode.trim() === ''}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-30"
            >
              Unirse
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-3 text-center">Add to Home Screen</h2>

        {(isIOS || (!isIOS && !isAndroid)) && (
          <div className="mb-3">
            <p className="font-semibold text-yellow-400 mb-1">iPhone (Safari only):</p>
            <ol className="text-sm space-y-1 text-green-100">
              <li>1. Open in <strong>Safari</strong></li>
              <li>2. Tap <strong>⋯</strong> (3 dots)</li>
              <li>3. Tap <strong>Share</strong></li>
              <li>4. Tap <strong>⋯</strong> (More)</li>
              <li>5. Tap <strong>Add to Home Screen</strong></li>
            </ol>
          </div>
        )}

        {(isAndroid || (!isIOS && !isAndroid)) && (
          <div className="mb-3">
            <p className="font-semibold text-yellow-400 mb-1">Android (Chrome):</p>
            <ol className="text-sm space-y-1 text-green-100">
              <li>1. Tap menu <strong>⋮</strong></li>
              <li>2. Tap <strong>Add to Home Screen</strong></li>
            </ol>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default App
