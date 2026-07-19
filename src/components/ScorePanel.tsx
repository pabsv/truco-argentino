import { MatchBoxes } from './MatchBoxes'

interface ScorePanelProps {
  score: number
  onIncrement: () => void
  onDecrement: () => void
  compact?: boolean
}

export function ScorePanel({ score, onIncrement, onDecrement, compact = false }: ScorePanelProps) {
  const handleTap = () => {
    if (score < 30) {
      onIncrement()
    }
  }

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'
  const buttonGap = compact ? 'gap-2' : 'gap-3'

  return (
    <div className="flex-1 flex flex-col items-center p-2 min-h-0">
      <div
        className="flex-1 flex items-center justify-center cursor-pointer active:opacity-80 w-full"
        onClick={handleTap}
      >
        <MatchBoxes score={score} />
      </div>
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
