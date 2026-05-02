import { useState, useEffect } from 'react'
import { useWakeLock } from './hooks/useWakeLock'

const WINNING_SCORE = 30

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
  const [showInfo, setShowInfo] = useState(false)

  useWakeLock()

  useEffect(() => {
    localStorage.setItem('truco-nosotros', nosotros.toString())
    localStorage.setItem('truco-ellos', ellos.toString())
    localStorage.setItem('truco-otros', otros.toString())
    localStorage.setItem('truco-three-player', threePlayerMode.toString())
  }, [nosotros, ellos, otros, threePlayerMode])

  const winner =
    nosotros >= WINNING_SCORE ? 'Nosotros' :
    ellos >= WINNING_SCORE ? 'Ellos' :
    (threePlayerMode && otros >= WINNING_SCORE) ? 'Otros' : null

  const updateScore = (team: 'nosotros' | 'ellos' | 'otros', delta: number) => {
    if (team === 'nosotros') {
      setNosotros(prev => Math.max(0, Math.min(30, prev + delta)))
    } else if (team === 'ellos') {
      setEllos(prev => Math.max(0, Math.min(30, prev + delta)))
    } else {
      setOtros(prev => Math.max(0, Math.min(30, prev + delta)))
    }
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const resetGame = () => {
    setNosotros(0)
    setEllos(0)
    setOtros(0)
    localStorage.removeItem('truco-nosotros')
    localStorage.removeItem('truco-ellos')
    localStorage.removeItem('truco-otros')
  }

  return (
    <div className="h-dvh bg-green-800 flex flex-col text-white overflow-hidden touch-none">
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
        <div className="flex-1 flex min-h-0">
          {/* Nosotros */}
          <div className="flex-1 flex flex-col border-r border-green-700 min-h-0">
            <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
              <h2 className="text-base font-semibold">Nosotros</h2>
            </div>
            <ScorePanel
              score={nosotros}
              onIncrement={() => updateScore('nosotros', 1)}
              onDecrement={() => updateScore('nosotros', -1)}
              compact={threePlayerMode}
            />
          </div>

          {/* Ellos */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
              <h2 className="text-base font-semibold">Ellos</h2>
            </div>
            <ScorePanel
              score={ellos}
              onIncrement={() => updateScore('ellos', 1)}
              onDecrement={() => updateScore('ellos', -1)}
              compact={threePlayerMode}
            />
          </div>

          {/* Otros (3-player mode) */}
          {threePlayerMode && (
            <div className="flex-1 flex flex-col border-l border-green-700 min-h-0">
              <div className="bg-green-900/50 py-1.5 text-center border-b border-green-700 flex-shrink-0">
                <h2 className="text-base font-semibold">Otros</h2>
              </div>
              <ScorePanel
                score={otros}
                onIncrement={() => updateScore('otros', 1)}
                onDecrement={() => updateScore('otros', -1)}
                compact={threePlayerMode}
              />
            </div>
          )}
        </div>

        {/* Reset button with safe area for home indicator */}
        <div className="px-3 pt-3 bg-green-900 border-t border-green-700 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={resetGame}
            className="w-full py-2.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold transition-colors"
          >
            Nueva Partida
          </button>
        </div>
      </main>

      {/* Winner banner */}
      {winner && (
        <div className="fixed left-4 right-4 z-50" style={{ top: 'calc(env(safe-area-inset-top) + 3rem)' }}>
          <div className="bg-yellow-500 text-green-900 rounded-lg px-4 py-2 text-center font-bold shadow-lg flex items-center justify-center gap-2">
            <span>🏆</span>
            <span>¡{winner} ganan!</span>
          </div>
        </div>
      )}

      {/* Info modal */}
      {showInfo && (
        <InfoModal
          onClose={() => setShowInfo(false)}
          threePlayerMode={threePlayerMode}
          onToggleThreePlayer={() => setThreePlayerMode(prev => !prev)}
        />
      )}
    </div>
  )
}

interface ScorePanelProps {
  score: number
  onIncrement: () => void
  onDecrement: () => void
  compact?: boolean
}

function ScorePanel({ score, onIncrement, onDecrement, compact = false }: ScorePanelProps) {
  const handleTap = () => {
    if (score < 30) {
      onIncrement()
    }
  }

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'
  const buttonGap = compact ? 'gap-2' : 'gap-3'

  return (
    <div className="flex-1 flex flex-col items-center p-2 min-h-0">
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
          className={`${buttonSize} font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          −
        </button>
        <button
          onClick={onIncrement}
          disabled={score >= 30}
          className={`${buttonSize} font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          +
        </button>
      </div>
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

      {/* Match 1: Left */}
      {points >= 1 && (
        <line
          x1={pad} y1={pad}
          x2={pad} y2={size - pad}
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Match 2: Top */}
      {points >= 2 && (
        <line
          x1={pad} y1={pad}
          x2={size - pad} y2={pad}
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Match 3: Right */}
      {points >= 3 && (
        <line
          x1={size - pad} y1={pad}
          x2={size - pad} y2={size - pad}
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Match 4: Bottom */}
      {points >= 4 && (
        <line
          x1={pad} y1={size - pad}
          x2={size - pad} y2={size - pad}
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Match 5: Diagonal */}
      {points >= 5 && (
        <line
          x1={pad} y1={pad}
          x2={size - pad} y2={size - pad}
          stroke={matchColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

interface InfoModalProps {
  onClose: () => void
  threePlayerMode: boolean
  onToggleThreePlayer: () => void
}

function InfoModal({ onClose, threePlayerMode, onToggleThreePlayer }: InfoModalProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600" onClick={e => e.stopPropagation()}>
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
