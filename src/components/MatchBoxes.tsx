function MatchBox({ points, active }: { points: number; active: boolean }) {
  const size = 56
  const strokeWidth = 4
  const matchColor = active ? '#fbbf24' : '#ffffff30'
  const pad = 6

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <rect
        x={pad} y={pad}
        width={size - pad * 2} height={size - pad * 2}
        fill="none"
        stroke="#ffffff20"
        strokeWidth={1}
        rx={3}
      />
      {points >= 1 && (
        <line x1={pad} y1={pad} x2={pad} y2={size - pad} stroke={matchColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {points >= 2 && (
        <line x1={pad} y1={pad} x2={size - pad} y2={pad} stroke={matchColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {points >= 3 && (
        <line x1={size - pad} y1={pad} x2={size - pad} y2={size - pad} stroke={matchColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {points >= 4 && (
        <line x1={pad} y1={size - pad} x2={size - pad} y2={size - pad} stroke={matchColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {points >= 5 && (
        <line x1={pad} y1={pad} x2={size - pad} y2={size - pad} stroke={matchColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
    </svg>
  )
}

export function MatchBoxes({ score }: { score: number }) {
  const malasScore = Math.min(score, 15)
  const buenasScore = Math.max(0, score - 15)

  return (
    <div className="flex flex-col items-center gap-1 flex-1 justify-center">
      {[0, 1, 2].map(boxIndex => (
        <MatchBox
          key={`malas-${boxIndex}`}
          points={Math.max(0, Math.min(5, malasScore - boxIndex * 5))}
          active={true}
        />
      ))}
      <div className="w-16 h-0.5 bg-yellow-500/60 my-1 rounded" />
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
