import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useWakeLock } from './hooks/useWakeLock'
import { GameSummary, type ScoreEvent } from './components/GameSummary'
import { ShareApp } from './components/ShareApp'
import { CardRanking } from './components/CardRanking'
import { teamColor } from './lib/teamColors'
import { stickColor, useSkin } from './lib/skins'
import { MatchBox } from './components/MatchBox'
import { SkinsTab } from './components/SkinsTab'
import { TeamPicker } from './components/TeamPicker'
import { loadPlayers, savePlayers } from './lib/players'
import { addPoint, breakRun, type Runs } from './lib/streaks'

const WINNING_SCORE = 30
// Score at which the buenas boxes light up
const BUENAS_SCORE = 15

type TeamKey = 'nosotros' | 'ellos' | 'otros'

function loadEvents(): ScoreEvent[] {
  try {
    const raw = localStorage.getItem('truco-game-events')
    return raw ? (JSON.parse(raw) as ScoreEvent[]) : []
  } catch {
    return []
  }
}

// Snapshot of a game interrupted by "Nueva Partida", so an accidental tap
// can be undone. Kept in localStorage until the new game actually starts.
interface GameSnapshot {
  scores: Record<TeamKey, number>
  threePlayerMode: boolean
  events: ScoreEvent[]
  savedAt: number
}

function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = localStorage.getItem('truco-last-game')
    return raw ? (JSON.parse(raw) as GameSnapshot) : null
  } catch {
    return null
  }
}

// Friendly trash talk for the losing team, 90s bowling-alley style
const TAUNTS = [
  'a lavar los platos 🧽',
  'paga el asado 🍖',
  'paga las birras 🍺',
  'a practicar al solitario 🃏',
  'qué baile te pegaron 💃',
  'mejor jugá a la escoba 🧹',
  'ni con el ancho te salvás 😂',
]

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
  const [savedPlayers, setSavedPlayers] = useState<string[]>(loadPlayers)
  const [pickerTeam, setPickerTeam] = useState<TeamKey | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showRanking, setShowRanking] = useState(false)

  // Point-by-point log of the current game, used for the end-of-game summary
  const [events, setEvents] = useState<ScoreEvent[]>(loadEvents)
  const [summaryDismissed, setSummaryDismissed] = useState(false)

  // Last game interrupted by "Nueva Partida" — offered back until the new game starts
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(loadSnapshot)

  // Streak: a run of points by the same team triggers a celebration. Each
  // team has its own run (see lib/streaks): it lasts until every rival has
  // scored since the team's last point, or a correction, no matter how much
  // time passes. With 3 teams two of them can be on a run at the same time.
  const streakRef = useRef<Runs>({})
  const [streaks, setStreaks] = useState<Record<string, { count: number; id: number }>>({})

  useEffect(() => {
    if (Object.keys(streaks).length === 0) return
    const timer = setTimeout(() => setStreaks({}), 2600)
    return () => clearTimeout(timer)
  }, [streaks])

  // The 67 moment: a streak that goes 6... and then 7 shows the 67 chip for a
  // few seconds. Is it good? Is it bad? It's 67.
  const [sixSeven, setSixSeven] = useState<{ team: string; id: number } | null>(null)

  // Skin settings (Settings > Skins): background, stick style, streaks on/off
  const skin = useSkin()

  useEffect(() => {
    if (!sixSeven) return
    const timer = setTimeout(() => setSixSeven(null), 3300)
    return () => clearTimeout(timer)
  }, [sixSeven])

  // Reaching las buenas calls down a lightning strike on that team's panel
  const [lightning, setLightning] = useState<{ team: TeamKey; id: number } | null>(null)

  useEffect(() => {
    if (!lightning) return
    const timer = setTimeout(() => setLightning(null), 2200)
    return () => clearTimeout(timer)
  }, [lightning])

  useWakeLock()

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
    if (events.length > 0) localStorage.setItem('truco-game-events', JSON.stringify(events))
    else localStorage.removeItem('truco-game-events')
  }, [events])

  useEffect(() => {
    if (snapshot) localStorage.setItem('truco-last-game', JSON.stringify(snapshot))
    else localStorage.removeItem('truco-last-game')
  }, [snapshot])

  const teams: { key: TeamKey; name: string; players: string[]; score: number }[] = [
    { key: 'nosotros', name: nosotrosName, players: [], score: nosotros },
    { key: 'ellos', name: ellosName, players: [], score: ellos },
    ...(threePlayerMode ? [{ key: 'otros' as TeamKey, name: otrosName, players: [], score: otros }] : []),
  ]

  const winnerTeam = teams.find(t => t.score >= WINNING_SCORE) ?? null
  const winner = winnerTeam?.name ?? null

  // Open the end-of-game summary whenever a winner is decided
  useEffect(() => {
    if (winner) setSummaryDismissed(false)
  }, [winner])

  // Loser = lowest-scoring team that didn't win (the one who gets roasted)
  const loser = useMemo(() => {
    if (!winner) return null
    const teams = [
      { name: nosotrosName, score: nosotros },
      { name: ellosName, score: ellos },
      ...(threePlayerMode ? [{ name: otrosName, score: otros }] : []),
    ].filter(t => t.name !== winner)
    if (teams.length === 0) return null
    return teams.reduce((a, b) => (b.score < a.score ? b : a)).name
  }, [winner, nosotros, ellos, otros, nosotrosName, ellosName, otrosName, threePlayerMode])

  // The big celebration can be dismissed (e.g. to correct a mis-tap);
  // we remember who it was dismissed for so it doesn't reappear mid-correction
  const [celebrationDismissedFor, setCelebrationDismissedFor] = useState<string | null>(null)
  const [taunt, setTaunt] = useState(TAUNTS[0])

  // Stable so the intro's auto-advance timer isn't restarted on every render
  const finishCelebration = useCallback(() => {
    setCelebrationDismissedFor(winner)
    setSummaryDismissed(false)
  }, [winner])

  const updateScore = (team: 'nosotros' | 'ellos' | 'otros', delta: number) => {
    // Log the change only if it actually moves the score (clamped at 0 and 30),
    // storing the resulting board so the summary charts reflect exactly what happened
    const scores = { nosotros, ellos, otros }
    const next = Math.max(0, Math.min(30, scores[team] + delta))
    if (next !== scores[team]) {
      setEvents(prev => [
        ...prev,
        { team, delta: delta > 0 ? 1 : -1, at: Date.now(), scores: { ...scores, [team]: next } },
      ])
      // First point of a new game commits to it — the interrupted game is gone
      setSnapshot(null)
    }

    if (team === 'nosotros') {
      setNosotros(prev => Math.max(0, Math.min(30, prev + delta)))
    } else if (team === 'ellos') {
      setEllos(prev => Math.max(0, Math.min(30, prev + delta)))
    } else {
      setOtros(prev => Math.max(0, Math.min(30, prev + delta)))
    }

    const current = team === 'nosotros' ? nosotros : team === 'ellos' ? ellos : otros
    if (delta > 0 && current < WINNING_SCORE && current + delta >= WINNING_SCORE) {
      setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)])
      if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 250])
    }
    if (delta > 0 && current < BUENAS_SCORE && current + delta >= BUENAS_SCORE) {
      setLightning({ team, id: Date.now() })
    }

    const runs = streakRef.current
    const dropStreaks = (gone: string[]) => {
      if (gone.length === 0) return
      setStreaks(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !gone.includes(k))))
      setSixSeven(prev => (prev && gone.includes(prev.team) ? null : prev))
    }
    if (delta > 0) {
      // A broken run silences that team's celebration if it's still on screen
      dropStreaks(addPoint(runs, team, teams.map(t => t.key)))
      const count = runs[team].count
      if (count >= 3) setStreaks(prev => ({ ...prev, [team]: { count, id: Date.now() } }))
      if (count === 7) setSixSeven({ team, id: Date.now() })
    } else {
      // A correction breaks that team's streak and re-arms the celebration
      breakRun(runs, team)
      dropStreaks([team])
      setCelebrationDismissedFor(null)
    }

    if (navigator.vibrate) navigator.vibrate(10)
  }

  const resetGame = () => {
    // A game abandoned mid-play is kept as a snapshot so an accidental
    // "Nueva Partida" tap can be undone
    const hasPoints = teams.some(t => t.score > 0)
    if (!winner && hasPoints) {
      setSnapshot({
        scores: { nosotros, ellos, otros },
        threePlayerMode,
        events,
        savedAt: Date.now(),
      })
    }
    setNosotros(0)
    setEllos(0)
    setOtros(0)
    setEvents([])
    setSummaryDismissed(false)
    streakRef.current = {}
    setStreaks({})
    setSixSeven(null)
    setLightning(null)
    setCelebrationDismissedFor(null)
    localStorage.removeItem('truco-nosotros')
    localStorage.removeItem('truco-ellos')
    localStorage.removeItem('truco-otros')
  }

  // Hold a panel to move that team to the other side: names, scores, the
  // event log and any running streak all follow the team to its new side
  const swapSides = (a: TeamKey, b: TeamKey) => {
    if (a === b) return
    const scoreSet = { nosotros: setNosotros, ellos: setEllos, otros: setOtros }
    const nameSet = { nosotros: setNosotrosName, ellos: setEllosName, otros: setOtrosName }
    const scores = { nosotros, ellos, otros }
    const names = { nosotros: nosotrosName, ellos: ellosName, otros: otrosName }
    scoreSet[a](scores[b])
    scoreSet[b](scores[a])
    nameSet[a](names[b])
    nameSet[b](names[a])
    const flip = (k: string) => (k === a ? b : k === b ? a : k)
    setEvents(prev => prev.map(e => ({
      ...e,
      team: flip(e.team),
      scores: e.scores && { ...e.scores, [a]: e.scores[b] ?? 0, [b]: e.scores[a] ?? 0 },
    })))
    streakRef.current = Object.fromEntries(
      Object.entries(streakRef.current).map(([k, r]) => [flip(k), { ...r, rivals: r.rivals.map(flip) }]),
    )
    setStreaks(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [flip(k), v])))
    setSixSeven(prev => (prev ? { ...prev, team: flip(prev.team) } : prev))
    setLightning(null)
    if (navigator.vibrate) navigator.vibrate([15, 40, 15])
  }

  // Bring back the game interrupted by "Nueva Partida"
  const restoreGame = () => {
    if (!snapshot) return
    setNosotros(snapshot.scores.nosotros)
    setEllos(snapshot.scores.ellos)
    setOtros(snapshot.scores.otros)
    setThreePlayerMode(snapshot.threePlayerMode)
    setEvents(snapshot.events)
    setSnapshot(null)
    if (navigator.vibrate) navigator.vibrate(10)
  }

  return (
    <div className="app-fade fixed inset-0 bg-green-800 flex flex-col text-white overflow-hidden touch-none">
      {/* Header with safe area for notch */}
      <header className="bg-green-900 px-3 border-b border-green-700 flex-shrink-0 flex items-center justify-between" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        <div className="w-7" />
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
        <div className="relative flex-1 flex min-h-0">
          {/* The 67 chip: shows while the scoreboard reads 6 to 7, and for a few
              seconds after a streak goes 6... 7. Subtle on purpose: taps pass
              through and the game never stops for it */}
          {((!threePlayerMode && Math.min(nosotros, ellos) === 6 && Math.max(nosotros, ellos) === 7) || (skin.streaks && sixSeven)) && (
            <SixSevenChip key={(skin.streaks && sixSeven?.id) || 'score'} />
          )}
          {/* Nosotros */}
          <div className="flex-1 flex flex-col border-r border-green-700 min-h-0">
            <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
              <TeamNameButton name={nosotrosName} onClick={() => setPickerTeam('nosotros')} />
            </div>
            <ScorePanel
              score={nosotros}
              onIncrement={() => updateScore('nosotros', 1)}
              onDecrement={() => updateScore('nosotros', -1)}
              swapTargets={threePlayerMode ? [{ label: '→', onSwap: () => swapSides('nosotros', 'ellos') }] : [{ label: '⇄ Cambiar de lado', onSwap: () => swapSides('nosotros', 'ellos') }]}
              compact={threePlayerMode}
              streak={(skin.streaks && streaks.nosotros) || null}
              color={teamColor(0)}
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
              swapTargets={threePlayerMode ? [{ label: '←', onSwap: () => swapSides('ellos', 'nosotros') }, { label: '→', onSwap: () => swapSides('ellos', 'otros') }] : [{ label: '⇄ Cambiar de lado', onSwap: () => swapSides('ellos', 'nosotros') }]}
              compact={threePlayerMode}
              streak={(skin.streaks && streaks.ellos) || null}
              color={teamColor(1)}
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
                swapTargets={[{ label: '←', onSwap: () => swapSides('otros', 'ellos') }]}
                compact={threePlayerMode}
                streak={(skin.streaks && streaks.otros) || null}
                color={teamColor(2)}
              />
            </div>
          )}
        </div>

        {/* Reset button with safe area for home indicator */}
        <div className="px-3 pt-3 bg-green-900 border-t border-green-700 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {/* Offer to restore the interrupted game until the new one starts */}
          {snapshot && !winner && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={restoreGame}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-green-900 rounded-lg font-semibold transition active:scale-[0.98]"
              >
                ↩ Volver a la partida ({[snapshot.scores.nosotros, snapshot.scores.ellos, ...(snapshot.threePlayerMode ? [snapshot.scores.otros] : [])].join(' – ')})
              </button>
              <button
                onClick={() => setSnapshot(null)}
                aria-label="Descartar partida anterior"
                className="w-11 rounded-lg bg-green-700 hover:bg-green-600 active:bg-green-500 font-bold transition flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}
          <button
            onClick={resetGame}
            className="w-full py-2.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold transition active:scale-[0.98]"
          >
            Nueva Partida
          </button>
        </div>
      </main>

      {/* Lightning strike on the team that just reached las buenas */}
      {lightning && (
        <LightningStrike
          key={lightning.id}
          position={Math.max(0, teams.findIndex(t => t.key === lightning.team))}
          teamCount={teams.length}
          teamName={teams.find(t => t.key === lightning.team)?.name ?? lightning.team}
          color={teamColor(Math.max(0, (['nosotros', 'ellos', 'otros'] as const).indexOf(lightning.team)))}
        />
      )}

      {/* Winner flow: short strike intro (tap to skip), then summary, then compact banner */}
      {winner && celebrationDismissedFor !== winner && (
        <WinCelebration winner={winner} onDone={finishCelebration} />
      )}

      {/* End-of-game summary with momentum and highlights */}
      {winner && celebrationDismissedFor === winner && !summaryDismissed && (
        <>
          <Confetti />
          <GameSummary
            teams={teams}
            events={events}
            winnerName={winner}
            taunt={loser ? `¡${loser}, ${taunt}!` : null}
            onNewGame={resetGame}
            onClose={() => setSummaryDismissed(true)}
          />
        </>
      )}

      {/* Compact banner while correcting scores — tap to reopen the summary */}
      {winner && celebrationDismissedFor === winner && summaryDismissed && (
        <>
          <Confetti />
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
        </>
      )}

      {/* Team picker: saved players + free typing */}
      {pickerTeam && (
        <TeamPicker
          defaultName={{ nosotros: 'Nosotros', ellos: 'Ellos', otros: 'Otros' }[pickerTeam]}
          currentName={{ nosotros: nosotrosName, ellos: ellosName, otros: otrosName }[pickerTeam]}
          players={savedPlayers}
          onPlayersChange={next => { setSavedPlayers(next); savePlayers(next) }}
          onApply={name => ({ nosotros: setNosotrosName, ellos: setEllosName, otros: setOtrosName })[pickerTeam](name)}
          onClose={() => setPickerTeam(null)}
        />
      )}

      {/* Info modal */}
      {showInfo && (
        <InfoModal
          onClose={() => setShowInfo(false)}
          threePlayerMode={threePlayerMode}
          onToggleThreePlayer={() => setThreePlayerMode(prev => !prev)}
          onShowRanking={() => { setShowInfo(false); setShowRanking(true) }}
        />
      )}

      {/* Card order sheet (landscape) */}
      {showRanking && <CardRanking onClose={() => setShowRanking(false)} />}
    </div>
  )
}

function TeamNameButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <h2 onClick={onClick} className="text-base font-semibold cursor-pointer truncate px-2">
      {name}
    </h2>
  )
}

interface ScorePanelProps {
  score: number
  onIncrement: () => void
  onDecrement: () => void
  // Shown after holding the panel: move this team to another side
  swapTargets?: { label: string; onSwap: () => void }[]
  compact?: boolean
  streak?: { count: number; id: number } | null
  color: string
}

const HOLD_MS = 550

function ScorePanel({ score, onIncrement, onDecrement, swapTargets = [], compact = false, streak = null, color }: ScorePanelProps) {
  const [swapOpen, setSwapOpen] = useState(false)
  const holdRef = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null)

  const cancelHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current.timer)
  }
  useEffect(() => cancelHold, [])

  const startHold = (e: React.PointerEvent) => {
    cancelHold()
    const hold = { x: e.clientX, y: e.clientY, fired: false, timer: 0 }
    hold.timer = window.setTimeout(() => {
      hold.fired = true
      if (swapTargets.length === 0) return
      setSwapOpen(true)
      if (navigator.vibrate) navigator.vibrate(30)
    }, HOLD_MS)
    holdRef.current = hold
  }

  const moveHold = (e: React.PointerEvent) => {
    const h = holdRef.current
    if (h && !h.fired && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 12) cancelHold()
  }

  const handleTap = () => {
    // The click that ends a long press must not also add a point
    if (holdRef.current?.fired) {
      holdRef.current = null
      return
    }
    cancelHold()
    if (score < 30) {
      onIncrement()
    }
  }

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'
  const buttonGap = compact ? 'gap-2' : 'gap-3'

  return (
    <div className="relative flex-1 flex flex-col items-center p-2 min-h-0">
      {streak && <StreakBadge key={streak.id} count={streak.count} color={color} />}
      {/* Match boxes display - tappable to increment */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer active:opacity-80 w-full"
        style={{ WebkitTouchCallout: 'none' }}
        onClick={handleTap}
        onPointerDown={startHold}
        onPointerMove={moveHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={e => e.preventDefault()}
      >
        <MatchBoxes score={score} />
      </div>

      {/* Long press menu: move this team (name and count) to another side */}
      {swapOpen && (
        <div
          className="modal-backdrop absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-green-950/80 rounded-lg"
          onClick={() => setSwapOpen(false)}
        >
          <p className="text-sm font-semibold text-green-100">Mover al otro lado</p>
          <div className="flex gap-2">
            {swapTargets.map(t => (
              <button
                key={t.label}
                onClick={e => { e.stopPropagation(); setSwapOpen(false); t.onSwap() }}
                className="px-4 py-3 min-w-14 text-lg font-bold rounded-xl bg-yellow-500 active:bg-yellow-300 text-green-950 shadow-lg transition active:scale-95"
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-green-200/70">Tocá afuera para cancelar</span>
        </div>
      )}

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

function StreakBadge({ count, color }: { count: number; color: string }) {
  // Escalating celebrations: a team on a constant run keeps unlocking new sets.
  // 6 builds the suspense, 7 completes the prophecy (and drops the 67 chip on the board).
  const label =
    count >= 15 ? '👑 ¡Leyenda!' :
    count >= 12 ? '⚡ ¡Imparables!' :
    count >= 9 ? '🌪️ ¡Huracán!' :
    count >= 8 ? '🚀 ¡Qué paliza!' :
    count === 7 ? '🫴 ¡SEIS SIETE! 🫴' :
    count === 6 ? '6️⃣… ¿y? 👀' :
    count >= 5 ? '💥 ¡Vamooo!' :
    count >= 4 ? '🔥🔥' : '🔥'

  return (
    <div
      className="streak-pop pointer-events-none absolute top-1/4 left-1/2 z-30 flex flex-col items-center bg-green-950/85 rounded-2xl px-4 py-2 border shadow-lg"
      style={{ borderColor: `${color}66` }}
    >
      <span className="text-4xl font-black drop-shadow-lg" style={{ color }}>+{count}</span>
      <span className="text-lg font-bold whitespace-nowrap drop-shadow">{label}</span>
    </div>
  )
}

// Small bouncing "67" chip at the top of the scoreboard, palms weighing
// invisible melons. Purely decorative.
function SixSevenChip() {
  return (
    <div className="six-seven-chip pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2" aria-hidden="true">
      <div className="six-seven-bounce flex items-center gap-1 bg-green-950/85 border border-yellow-500/40 rounded-full px-3 py-1 shadow-lg">
        <span className="six-seven-hand inline-block text-sm" style={{ scale: '-1 1' }}>🫴</span>
        <span className="text-xs font-black text-yellow-400 tracking-widest">67</span>
        <span className="six-seven-hand six-seven-hand-alt inline-block text-sm">🫴</span>
      </div>
    </div>
  )
}

// A bolt cracks down onto the panel of the team that just reached las buenas:
// the sky flickers, the bolt draws itself in, the impact glows, then it all
// fades. Purely decorative, taps pass through.
interface LightningStrikeProps {
  position: number
  teamCount: number
  teamName: string
  color: string
}

function LightningStrike({ position, teamCount, teamName, color }: LightningStrikeProps) {
  // Vibrating here (post-render) so the tap's own vibrate(10) doesn't stomp it
  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([40, 50, 40, 50, 300])
  }, [])

  const left = `${((position + 0.5) / teamCount) * 100}%`
  const bolt = '34,0 22,52 38,56 16,112 34,116 10,170 30,174 20,200'
  const branch = '38,56 50,80 46,84 56,108'

  return (
    <div className="lightning-overlay pointer-events-none fixed inset-0 z-[46] overflow-hidden" aria-hidden="true">
      <div className="lightning-flash absolute inset-0 bg-white" />

      <div className="lightning-shake absolute inset-0">
        <svg
          className="lightning-bolt absolute top-0 -translate-x-1/2"
          style={{ left, height: '62%', width: 'auto', aspectRatio: '60 / 200' }}
          viewBox="0 0 60 200"
        >
          {[bolt, branch].map(points => (
            <polyline
              key={points}
              points={points}
              pathLength={1}
              fill="none"
              stroke="#fef9c3"
              strokeWidth={points === bolt ? 4 : 2.5}
              strokeLinejoin="miter"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="lightning-impact absolute" style={{ left, top: '62%' }} />

        <div className="absolute inset-x-3 bottom-[18%] flex flex-col items-center gap-1 bg-green-950/80 rounded-2xl px-3 py-2 shadow-lg">
          <div className="winner-slam text-3xl font-black text-white text-center whitespace-nowrap" style={{ textShadow: '3px 3px 0 #ca8a04, 0 0 24px #fde047' }}>
            ⚡ ¡A LAS BUENAS! ⚡
          </div>
          <p className="text-lg font-bold text-center truncate max-w-full drop-shadow" style={{ color }}>
            {teamName} ya está en las buenas
          </p>
        </div>
      </div>
    </div>
  )
}

// Counting squares on the scoreboard (MatchBox default is 56)
const BOX_SIZE = 62

function MatchBoxes({ score }: { score: number }) {
  const skin = useSkin()
  const { stick } = skin
  const color = stickColor(skin)
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
          stick={stick}
          color={color}
          size={BOX_SIZE}
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
          stick={stick}
          color={color}
          size={BOX_SIZE}
        />
      ))}
    </div>
  )
}

const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#fde68a', '#4ade80', '#ffffff']

function Confetti({ zClass = 'z-40' }: { zClass?: string }) {
  return (
    <div className={`pointer-events-none fixed inset-0 ${zClass} overflow-hidden`} aria-hidden="true">
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

function Pin() {
  return <div className="pin-body" />
}

interface WinCelebrationProps {
  winner: string
  onDone: () => void
}

// How long the strike intro plays before handing over to the summary
const CELEBRATION_MS = 2800

// Short bowling-alley intro; a tap anywhere skips straight to the summary
function WinCelebration({ winner, onDone }: WinCelebrationProps) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(onDone, reduced ? 1200 : CELEBRATION_MS)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div
      className="crt fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-1 overflow-hidden px-4 cursor-pointer select-none"
      onClick={onDone}
    >
      <Confetti zClass="z-[60]" />

      <div className="retro-blink text-yellow-400 text-sm font-bold tracking-[0.3em] whitespace-nowrap">
        ★ ★ ★ ¡GANADOR! ★ ★ ★
      </div>
      <div className="winner-slam text-4xl font-black text-white text-center truncate max-w-full">
        {winner}
      </div>

      {/* Bowling lane: ball rolls in and scatters the pins */}
      <div className="relative w-full max-w-sm h-32 flex-shrink-0">
        <div className="absolute bottom-2.5 left-0 right-0 h-1 bg-yellow-900/60 rounded" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`lane-pin pin-fly-${i}`} style={{ left: `${62 + i * 8}%`, bottom: '12px' }}>
            <Pin />
          </div>
        ))}
        <div className="bowling-ball" />
        <div className="strike-text">¡STRIKE!</div>
      </div>

      <p className="tap-hint text-green-300/70 text-xs mt-4">toca para continuar</p>
    </div>
  )
}

interface InfoModalProps {
  onClose: () => void
  threePlayerMode: boolean
  onToggleThreePlayer: () => void
  onShowRanking: () => void
}

function InfoModal({ onClose, threePlayerMode, onToggleThreePlayer, onShowRanking }: InfoModalProps) {
  const [tab, setTab] = useState<'general' | 'skins'>(() =>
    sessionStorage.getItem('truco-settings-tab') === 'skins' ? 'skins' : 'general',
  )
  const pickTab = (t: 'general' | 'skins') => {
    setTab(t)
    try { sessionStorage.setItem('truco-settings-tab', t) } catch { /* private mode */ }
  }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Tabs */}
        <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 p-1 rounded-xl bg-green-950/60 border border-green-700">
          {([['general', '⚙️ General'], ['skins', '🎨 Skins']] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => pickTab(id)}
              className={`py-1.5 rounded-lg text-sm font-bold transition ${
                tab === id ? 'bg-yellow-500 text-green-950 shadow' : 'text-green-100 active:bg-green-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'skins' ? <SkinsTab /> : <>
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

        <button
          onClick={onShowRanking}
          className="w-full mb-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-green-950 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">🃏</span> Card order
        </button>

        <ShareApp />

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
        </>}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default App
