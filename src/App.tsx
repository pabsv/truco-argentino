import { useState, useEffect } from 'react'

const WINNING_SCORE = 30
const HALFWAY_SCORE = 15

function App() {
  const [nosotros, setNosotros] = useState(() => {
    const saved = localStorage.getItem('truco-nosotros')
    return saved ? parseInt(saved, 10) : 0
  })
  const [ellos, setEllos] = useState(() => {
    const saved = localStorage.getItem('truco-ellos')
    return saved ? parseInt(saved, 10) : 0
  })
  const [winner, setWinner] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('truco-nosotros', nosotros.toString())
    localStorage.setItem('truco-ellos', ellos.toString())

    if (nosotros >= WINNING_SCORE) {
      setWinner('Nosotros')
    } else if (ellos >= WINNING_SCORE) {
      setWinner('Ellos')
    }
  }, [nosotros, ellos])

  const updateScore = (team: 'nosotros' | 'ellos', delta: number) => {
    if (winner) return
    if (team === 'nosotros') {
      setNosotros(prev => Math.max(0, Math.min(30, prev + delta)))
    } else {
      setEllos(prev => Math.max(0, Math.min(30, prev + delta)))
    }
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const handleScoreInput = (team: 'nosotros' | 'ellos', value: string) => {
    if (winner) return
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    const clamped = Math.max(0, Math.min(30, num))
    if (team === 'nosotros') {
      setNosotros(clamped)
    } else {
      setEllos(clamped)
    }
  }

  const resetGame = () => {
    setNosotros(0)
    setEllos(0)
    setWinner(null)
    localStorage.removeItem('truco-nosotros')
    localStorage.removeItem('truco-ellos')
  }

  const getScoreDisplay = (score: number) => {
    const inBuenas = score >= HALFWAY_SCORE
    return { inBuenas, displayScore: inBuenas ? score - HALFWAY_SCORE : score }
  }

  const nosotrosData = getScoreDisplay(nosotros)
  const ellosData = getScoreDisplay(ellos)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      {/* Header */}
      <header className="bg-slate-800 py-3 px-4 text-center border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wide">Truco Argentino</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Score panels */}
        <div className="flex-1 flex">
          {/* Nosotros */}
          <div className="flex-1 flex flex-col border-r border-slate-700">
            <div className="bg-blue-900/50 py-2 text-center border-b border-slate-700">
              <h2 className="text-lg font-semibold text-blue-200">Nosotros</h2>
            </div>
            <ScorePanel
              score={nosotros}
              data={nosotrosData}
              color="blue"
              onIncrement={() => updateScore('nosotros', 1)}
              onDecrement={() => updateScore('nosotros', -1)}
              onInputChange={(v) => handleScoreInput('nosotros', v)}
              disabled={!!winner}
            />
          </div>

          {/* Ellos */}
          <div className="flex-1 flex flex-col">
            <div className="bg-red-900/50 py-2 text-center border-b border-slate-700">
              <h2 className="text-lg font-semibold text-red-200">Ellos</h2>
            </div>
            <ScorePanel
              score={ellos}
              data={ellosData}
              color="red"
              onIncrement={() => updateScore('ellos', 1)}
              onDecrement={() => updateScore('ellos', -1)}
              onInputChange={(v) => handleScoreInput('ellos', v)}
              disabled={!!winner}
            />
          </div>
        </div>

        {/* Reset button */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <button
            onClick={resetGame}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg font-semibold transition-colors"
          >
            Nueva Partida
          </button>
        </div>
      </main>

      {/* Winner modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm w-full border border-slate-600">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-2">¡{winner} ganan!</h2>
            <p className="text-slate-400 mb-6">Partida terminada</p>
            <button
              onClick={resetGame}
              className="w-full py-3 bg-green-600 hover:bg-green-500 active:bg-green-400 rounded-lg font-semibold transition-colors"
            >
              Nueva Partida
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ScorePanelProps {
  score: number
  data: { inBuenas: boolean; displayScore: number }
  color: 'blue' | 'red'
  onIncrement: () => void
  onDecrement: () => void
  onInputChange: (value: string) => void
  disabled: boolean
}

function ScorePanel({ score, data, color, onIncrement, onDecrement, onInputChange, disabled }: ScorePanelProps) {
  const bgColor = color === 'blue' ? 'bg-blue-600' : 'bg-red-600'
  const hoverColor = color === 'blue' ? 'hover:bg-blue-500' : 'hover:bg-red-500'
  const activeColor = color === 'blue' ? 'active:bg-blue-400' : 'active:bg-red-400'

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
      {/* Phase indicator */}
      <div className={`text-sm font-medium px-3 py-1 rounded-full ${data.inBuenas ? 'bg-green-600/30 text-green-300' : 'bg-yellow-600/30 text-yellow-300'}`}>
        {data.inBuenas ? 'Buenas' : 'Malas'}
      </div>

      {/* Score display and input */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={score}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={disabled}
          className="w-24 text-5xl font-bold text-center bg-slate-800 border border-slate-600 rounded-lg py-2 focus:outline-none focus:border-slate-400 disabled:opacity-50"
          min="0"
          max="30"
        />
      </div>

      {/* Progress bar with halfway marker */}
      <div className="w-full max-w-[160px]">
        <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${bgColor} transition-all duration-300`}
            style={{ width: `${(score / WINNING_SCORE) * 100}%` }}
          />
          {/* 15 point marker */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50" />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
          <span>15</span>
          <span>30</span>
        </div>
      </div>

      {/* Increment/Decrement buttons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onDecrement}
          disabled={disabled || score === 0}
          className={`w-16 h-16 text-3xl font-bold rounded-xl ${bgColor} ${hoverColor} ${activeColor} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          −
        </button>
        <button
          onClick={onIncrement}
          disabled={disabled || score >= 30}
          className={`w-16 h-16 text-3xl font-bold rounded-xl ${bgColor} ${hoverColor} ${activeColor} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default App
