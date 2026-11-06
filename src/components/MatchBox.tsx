import { useId } from 'react'
import type { StickId } from '../lib/skins'

// One box of the matchbox scoreboard: up to 5 sticks (left, top, right,
// bottom, diagonal), drawn in the chosen stick style.

type Seg = [number, number, number, number]

const SIZE = 56
const PAD = 6

// Straight square: every side runs corner to corner
function squareSegments(s: number, p: number): Seg[] {
  return [
    [p, p, p, s - p],         // left
    [p, p, s - p, p],         // top
    [s - p, p, s - p, s - p], // right
    [p, s - p, s - p, s - p], // bottom
    [p, p, s - p, s - p],     // diagonal
  ]
}

// Real matches can't share a corner: lay them as a pinwheel, tail to head,
// so each corner holds exactly one red head
function pinwheelSegments(s: number, p: number): Seg[] {
  const t = 7
  return [
    [p, s - p - t, p, p + 1],         // left, head top left
    [p + t, p, s - p - 1, p],         // top, head top right
    [s - p, p + t, s - p, s - p - 1], // right, head bottom right
    [s - p - t, s - p, p + 1, s - p], // bottom, head bottom left
    [s - p - 12, s - p - 12, p + 12, p + 12], // diagonal, head toward top left
  ]
}

interface MatchBoxProps {
  points: number
  active: boolean
  stick: StickId
  size?: number
}

export function MatchBox({ points, active, stick, size = SIZE }: MatchBoxProps) {
  const uid = useId().replace(/:/g, '')
  const scale = size / SIZE

  return (
    <svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} className="flex-shrink-0 overflow-visible">
      {/* Faint box guide */}
      {stick !== 'fosforo' && (
        <rect
          x={PAD} y={PAD}
          width={SIZE - PAD * 2} height={SIZE - PAD * 2}
          fill="none"
          stroke={stick === 'tiza' ? '#ffffff14' : '#ffffff20'}
          strokeWidth={1 / scale}
          rx={3}
        />
      )}
      {stick === 'fosforo' && (
        <rect x={PAD} y={PAD} width={SIZE - PAD * 2} height={SIZE - PAD * 2} fill="#00000014" rx={4} />
      )}

      {stick === 'linea' && <LineSticks points={points} active={active} />}
      {stick === 'fosforo' && <MatchSticks points={points} active={active} uid={uid} />}
      {stick === 'tiza' && <ChalkSticks points={points} active={active} uid={uid} />}
      {stick === 'neon' && <NeonSticks points={points} active={active} />}
    </svg>
  )
}

function LineSticks({ points, active }: { points: number; active: boolean }) {
  const color = active ? '#fbbf24' : '#ffffff30'
  return (
    <>
      {squareSegments(SIZE, PAD).slice(0, points).map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          pathLength={1}
          className="match-line"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
    </>
  )
}

function MatchSticks({ points, active, uid }: { points: number; active: boolean; uid: string }) {
  const flare = `flare-${uid}`
  return (
    <>
      <defs>
        <radialGradient id={flare}>
          <stop offset="0%" stopColor="#fff7c2" stopOpacity="1" />
          <stop offset="45%" stopColor="#fb923c" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      {pinwheelSegments(SIZE, PAD).slice(0, points).map(([x1, y1, x2, y2], i) => {
        const len = Math.hypot(x2 - x1, y2 - y1)
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
        return (
          <g key={i} transform={`translate(${x1} ${y1}) rotate(${angle})`} opacity={active ? 1 : 0.35}>
            <g className="stick-slide">
              {/* Shadow, wooden body, highlight */}
              <rect x={0.6} y={-1.2} width={len - 2} height={4.2} rx={1.2} fill="#00000040" />
              <rect x={0} y={-2.1} width={len - 2} height={4.2} rx={1.2} fill="#e3bd85" />
              <rect x={0.5} y={-2.1} width={len - 3} height={1.3} rx={0.6} fill="#f7e1b9" opacity={0.85} />
              {/* Red head with a glint */}
              <ellipse cx={len - 1.6} cy={0} rx={3.8} ry={3.1} fill="#b91c1c" />
              <ellipse cx={len - 1.2} cy={0.4} rx={3.1} ry={2.5} fill="#dc2626" />
              <ellipse cx={len - 2.6} cy={-1.1} rx={1.3} ry={0.8} fill="#fecaca" opacity={0.85} />
            </g>
            {/* The strike: a quick flare on the head as it lands */}
            <circle className="match-flare" cx={len - 1.6} cy={0} r={9} fill={`url(#${flare})`} />
          </g>
        )
      })}
    </>
  )
}

// Deterministic wobble so the chalk looks hand drawn but never jitters between renders
function chalkPath([x1, y1, x2, y2]: Seg, i: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const len = Math.hypot(x2 - x1, y2 - y1)
  const nx = -(y2 - y1) / len
  const ny = (x2 - x1) / len
  const bend = [1.4, -1.1, 0.9, -1.5, 1.2][i % 5]
  const over = [1.5, 0.5, 2, 1, 0.8][i % 5] // strokes overshoot a touch, like a real hand
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const sx = x1 - ux * over * 0.5
  const sy = y1 - uy * over * 0.5
  const ex = x2 + ux * over
  const ey = y2 + uy * over
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${(mx + nx * bend).toFixed(1)} ${(my + ny * bend).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
}

function ChalkSticks({ points, active, uid }: { points: number; active: boolean; uid: string }) {
  const rough = `chalk-${uid}`
  const color = active ? '#f8fafc' : '#ffffff40'
  return (
    <>
      <defs>
        <filter id={rough} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="shaky" />
          <feComposite in="shaky" in2="noise" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${rough})`}>
        {squareSegments(SIZE, PAD).slice(0, points).map((seg, i) => {
          const d = chalkPath(seg, i)
          return (
            <g key={i}>
              <path d={d} pathLength={1} className="match-line chalk-line" fill="none" stroke={color} strokeWidth={4.2} strokeLinecap="round" opacity={0.92} />
              <path d={d} pathLength={1} className="match-line chalk-line" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} transform="translate(0.9 -0.7)" />
            </g>
          )
        })}
      </g>
    </>
  )
}

function NeonSticks({ points, active }: { points: number; active: boolean }) {
  // Pink tube with a white hot core; the glow comes from stacked drop shadows
  const glow = active ? '#f472b6' : '#ffffff30'
  return (
    <g className="neon-sticks" style={{ filter: active ? 'drop-shadow(0 0 2.5px #ec4899) drop-shadow(0 0 6px #db2777aa)' : undefined }}>
      {squareSegments(SIZE, PAD).slice(0, points).map(([x1, y1, x2, y2], i) => (
        <g key={i} className="neon-flicker">
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={glow} strokeWidth={4.6} strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? '#fff1f7' : 'transparent'} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}
