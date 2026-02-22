import { useState, useEffect } from 'react'

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
  useEffect(() => {
    localStorage.setItem('truco-nosotros', nosotros.toString())
    localStorage.setItem('truco-ellos', ellos.toString())
  }, [nosotros, ellos])

  const winner = nosotros >= WINNING_SCORE ? 'Nosotros' : ellos >= WINNING_SCORE ? 'Ellos' : null

  const updateScore = (team: 'nosotros' | 'ellos', delta: number) => {
    if (team === 'nosotros') {
      setNosotros(prev => Math.max(0, Math.min(30, prev + delta)))
    } else {
      setEllos(prev => Math.max(0, Math.min(30, prev + delta)))
    }
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const resetGame = () => {
    setNosotros(0)
    setEllos(0)
    localStorage.removeItem('truco-nosotros')
    localStorage.removeItem('truco-ellos')
  }

  return (
    <div className="h-dvh bg-green-800 flex flex-col text-white overflow-hidden touch-none">
      {/* Header */}
      <header className="bg-green-900 py-2 px-4 text-center border-b border-green-700 flex-shrink-0">
        <h1 className="text-lg font-bold tracking-wide">Truco</h1>
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
            />
          </div>
        </div>

        {/* Reset button */}
        <div className="p-3 bg-green-900 border-t border-green-700 flex-shrink-0">
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
        <div className="fixed top-12 left-4 right-4 z-50">
          <div className="bg-yellow-500 text-green-900 rounded-lg px-4 py-2 text-center font-bold shadow-lg flex items-center justify-center gap-2">
            <span>🏆</span>
            <span>¡{winner} ganan!</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface ScorePanelProps {
  score: number
  onIncrement: () => void
  onDecrement: () => void
}

function ScorePanel({ score, onIncrement, onDecrement }: ScorePanelProps) {
  const handleTap = () => {
    if (score < 30) {
      onIncrement()
    }
  }

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
      <div className="flex gap-3 flex-shrink-0 pt-2">
        <button
          onClick={onDecrement}
          disabled={score === 0}
          className="w-14 h-14 text-3xl font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <button
          onClick={onIncrement}
          disabled={score >= 30}
          className="w-14 h-14 text-3xl font-bold rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

export default App
