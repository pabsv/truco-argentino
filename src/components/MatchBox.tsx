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

// Matches laid like a real hand does it: full length sides that cross a
// little at the corners, heads going round the square (top left, top right,
// bottom right, bottom left), so no two heads ever share a corner
function matchSegments(s: number, p: number): Seg[] {
  const o = 1.8 // overshoot past the corner
  return [
    [p, s - p + o, p, p - o],         // left, head top left
    [p - o, p, s - p + o, p],         // top, head top right
    [s - p, p - o, s - p, s - p + o], // right, head bottom right
    [s - p + o, s - p, p - o, s - p], // bottom, head bottom left
    [s - p - 5, s - p - 5, p + 6.5, p + 6.5], // diagonal, head toward top left
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

// Tiny deterministic tilt so the square looks placed by hand, not stamped
const MATCH_TILT = [-1.1, 0.7, -0.5, 0.9, -0.6]

function MatchSticks({ points, active, uid }: { points: number; active: boolean; uid: string }) {
  const wood = `wood-${uid}`
  const head = `head-${uid}`
  const shadow = `shadow-${uid}`
  const W = 2.5 // stick thickness
  const HL = 5.6 // head length
  const HW = 3.7 // head width

  const sticks = matchSegments(SIZE, PAD).slice(0, points).map(([x1, y1, x2, y2], i) => {
    const len = Math.hypot(x2 - x1, y2 - y1)
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + MATCH_TILT[i]
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    // Local frame: origin at the stick's middle, x along the stick, head at +x
    return { i, len, transform: `translate(${mx} ${my}) rotate(${angle.toFixed(2)})` }
  })

  // Teardrop head: rounded tip, tapering back into the stick
  const headPath = (len: number) => {
    const tip = len / 2
    const base = tip - HL
    return `M${base} ${-W / 2} C${base + 1.6} ${-HW / 2} ${tip - 1.4} ${-HW / 2} ${tip} 0 C${tip - 1.4} ${HW / 2} ${base + 1.6} ${HW / 2} ${base} ${W / 2} Z`
  }

  return (
    <g opacity={active ? 1 : 0.35}>
      <defs>
        {/* Wood: lit top edge, darker underside, across the stick's width */}
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3dfb8" />
          <stop offset="45%" stopColor="#dcb983" />
          <stop offset="100%" stopColor="#a87d47" />
        </linearGradient>
        {/* Head: deep oxblood with a soft lit shoulder, no cartoon gloss */}
        <radialGradient id={head} cx="0.62" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#a8382a" />
          <stop offset="55%" stopColor="#7a1d14" />
          <stop offset="100%" stopColor="#4a0f0a" />
        </radialGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      {/* Soft contact shadow under every stick */}
      <g filter={`url(#${shadow})`} opacity={0.45}>
        {sticks.map(({ i, len, transform }) => (
          <g key={i} transform={transform} className="stick-place">
            <rect x={-len / 2 + 0.5} y={-W / 2 + 0.9} width={len - 0.5} height={W + 0.3} rx={0.6} fill="#000" />
          </g>
        ))}
      </g>

      {/* Wooden bodies first, so every head sits on top of the stick it crosses */}
      {sticks.map(({ i, len, transform }) => (
        <g key={i} transform={transform} className="stick-place">
          <rect x={-len / 2} y={-W / 2} width={len - HL + 1} height={W} rx={0.35} fill={`url(#${wood})`} />
          {/* Grain: one faint line down the stick */}
          <line x1={-len / 2 + 1} y1={0.25} x2={len / 2 - HL - 0.5} y2={0.35} stroke="#9a6d3a" strokeWidth={0.25} opacity={0.5} />
        </g>
      ))}
      {sticks.map(({ i, len, transform }) => (
        <g key={i} transform={transform} className="stick-place">
          <path d={headPath(len)} fill={`url(#${head})`} />
          {/* Fine rim where the head meets the wood */}
          <path d={headPath(len)} fill="none" stroke="#2e0805" strokeWidth={0.3} opacity={0.6} />
        </g>
      ))}
    </g>
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
