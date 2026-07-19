import type { TrendSeries } from '../../lib/stats'

interface TrendChartProps {
  series: TrendSeries[]
}

const COLORS = ['#fbbf24', '#38bdf8', '#f472b6', '#a3e635', '#fb923c', '#c084fc']

// viewBox coordinate space
const W = 320
const H = 170
const PAD_L = 28
const PAD_R = 8
const PAD_T = 10
const PAD_B = 24

export function TrendChart({ series }: TrendChartProps) {
  // Common x-domain across all series (union of bucketStarts, chronological).
  const bucketSet = new Set<string>()
  for (const s of series) for (const p of s.points) bucketSet.add(p.bucketStart)
  const xs = [...bucketSet].sort((a, b) => Date.parse(a) - Date.parse(b))

  const hasData = xs.length > 0 && series.some((s) => s.points.length > 0)
  if (!hasData) {
    return (
      <div className="rounded-xl bg-green-900 border border-green-700 p-4 text-center text-sm text-green-300">
        Sin datos suficientes para la tendencia.
      </div>
    )
  }

  const xIndex = new Map(xs.map((b, i) => [b, i]))
  const n = xs.length
  const xOf = (i: number) => (n === 1 ? (PAD_L + (W - PAD_R)) / 2 : PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1))
  const yOf = (v: number) => PAD_T + (1 - v) * (H - PAD_T - PAD_B)

  const gridYs = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="rounded-xl bg-green-900 border border-green-700 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {/* gridlines + y labels (win %) */}
        {gridYs.map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              y1={yOf(g)}
              x2={W - PAD_R}
              y2={yOf(g)}
              stroke="#ffffff18"
              strokeWidth={1}
            />
            <text x={2} y={yOf(g) + 3} fontSize={8} fill="#86efac">
              {Math.round(g * 100)}
            </text>
          </g>
        ))}
        {/* x labels: first, middle, last */}
        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => {
            const label = series.flatMap((s) => s.points).find((p) => xIndex.get(p.bucketStart) === i)?.label ?? ''
            return (
              <text
                key={i}
                x={xOf(i)}
                y={H - 8}
                fontSize={8}
                fill="#86efac"
                textAnchor="middle"
              >
                {label}
              </text>
            )
          })}
        {/* series */}
        {series.map((s, si) => {
          const color = COLORS[si % COLORS.length]
          const pts = s.points
            .map((p) => ({ x: xOf(xIndex.get(p.bucketStart) ?? 0), y: yOf(p.cumulativeWinPct) }))
            .sort((a, b) => a.x - b.x)
          if (pts.length === 0) return null
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          return (
            <g key={s.playerId}>
              {pts.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
              ))}
            </g>
          )
        })}
      </svg>
      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1">
        {series.map((s, si) => (
          <span key={s.playerId} className="flex items-center gap-1 text-xs text-green-200">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[si % COLORS.length] }}
            />
            {s.name}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-green-400 text-center pt-0.5">% de victorias acumulado</p>
    </div>
  )
}
