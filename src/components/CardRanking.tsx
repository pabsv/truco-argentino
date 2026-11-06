import { useEffect, useState } from 'react'

// Truco card ranking, best to worst, drawn as a full screen landscape sheet in
// the style of a Spanish deck: one column per rank, holding every card of that
// rank. When the phone is held upright the sheet is rotated 90 degrees so it
// always reads sideways; tap anywhere to close.

type Suit = 'espada' | 'basto' | 'oro' | 'copa'
type Card = { n: number; suit: Suit }

const ALL_SUITS: Suit[] = ['espada', 'basto', 'oro', 'copa']
const every = (n: number): Card[] => ALL_SUITS.map(suit => ({ n, suit }))

const TIERS: Card[][] = [
  [{ n: 1, suit: 'espada' }],
  [{ n: 1, suit: 'basto' }],
  [{ n: 7, suit: 'espada' }],
  [{ n: 7, suit: 'oro' }],
  every(3),
  every(2),
  [{ n: 1, suit: 'copa' }, { n: 1, suit: 'oro' }],
  every(12),
  every(11),
  every(10),
  [{ n: 7, suit: 'copa' }, { n: 7, suit: 'basto' }],
  every(6),
  every(5),
  every(4),
]

const SUIT_COLOR: Record<Suit, string> = {
  espada: '#1d4ed8',
  basto: '#4d7c0f',
  oro: '#d97706',
  copa: '#dc2626',
}

// Suit pip drawn in a 24x24 box. Rendered inside the card's own SVG.
function Pip({ suit, x, y, size }: { suit: Suit; x: number; y: number; size: number }) {
  const c = SUIT_COLOR[suit]
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
      {suit === 'oro' && (
        <>
          <circle cx="12" cy="12" r="10" fill="#fbbf24" stroke={c} strokeWidth="1.6" />
          <circle cx="12" cy="12" r="5.6" fill="none" stroke={c} strokeWidth="1.4" />
          <circle cx="12" cy="12" r="1.8" fill={c} />
        </>
      )}
      {suit === 'copa' && (
        <>
          <path d="M4 2.5h16c0 6.4-3.4 10-8 10s-8-3.6-8-10z" fill={c} />
          <path d="M5.5 4.2h13" stroke="#fde68a" strokeWidth="1.2" />
          <rect x="10.7" y="12" width="2.6" height="5.8" fill="#b45309" />
          <path d="M6.5 22.5c0-2.8 2.4-4.6 5.5-4.6s5.5 1.8 5.5 4.6z" fill={c} />
        </>
      )}
      {suit === 'espada' && (
        <>
          <path d="M12 0.5l2.4 3.2v11.6H9.6V3.7z" fill="#93c5fd" stroke={c} strokeWidth="1.1" strokeLinejoin="round" />
          <rect x="5" y="14.6" width="14" height="2.8" rx="1.4" fill="#f59e0b" />
          <rect x="10.8" y="17.2" width="2.4" height="4.2" fill={c} />
          <circle cx="12" cy="22" r="1.8" fill="#f59e0b" />
        </>
      )}
      {suit === 'basto' && (
        <>
          <path d="M9.8 23.5L7.4 6.6C7 3.2 9.2 0.5 12 0.5s5 2.7 4.6 6.1l-2.4 16.9z" fill="#65a30d" stroke={c} strokeWidth="1.1" strokeLinejoin="round" />
          <circle cx="10.2" cy="7.6" r="1.4" fill="#365314" />
          <circle cx="13.9" cy="11.8" r="1.3" fill="#365314" />
          <circle cx="10.9" cy="16.6" r="1.2" fill="#365314" />
        </>
      )}
    </svg>
  )
}

// Pip positions inside the 36x58 art area, as on a real Spanish deck
const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[18, 29]],
  2: [[18, 11], [18, 47]],
  3: [[18, 9], [18, 29], [18, 49]],
  4: [[9, 10], [27, 10], [9, 48], [27, 48]],
  5: [[9, 10], [27, 10], [18, 29], [9, 48], [27, 48]],
  6: [[9, 9], [27, 9], [9, 29], [27, 29], [9, 49], [27, 49]],
  7: [[9, 8], [27, 8], [18, 20], [9, 33], [27, 33], [9, 50], [27, 50]],
}
const PIP_SIZE: Record<number, number> = { 1: 40, 2: 22, 3: 18, 4: 19, 5: 17, 6: 16, 7: 15 }

const SKIN = '#fcd9b6'
const INK = '#1f2937'

// Figures for 10 (sota), 11 (caballo) and 12 (rey), drawn in the 36x58 art area
function Figure({ n, suit }: { n: number; suit: Suit }) {
  const c = SUIT_COLOR[suit]
  if (n === 11) {
    return (
      <g>
        {/* Horse */}
        <path d="M5 34c0-4 4-6 10-6h8l5-9 5 1-2 5 1 5-4 1-2-2v9c0 3-3 5-7 5H12c-4 0-7-3-7-6z" fill="#a16207" stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
        <rect x="8" y="41" width="2.6" height="14" rx="1" fill="#a16207" stroke={INK} strokeWidth="0.6" />
        <rect x="13" y="41" width="2.6" height="14" rx="1" fill="#a16207" stroke={INK} strokeWidth="0.6" />
        <rect x="21" y="41" width="2.6" height="14" rx="1" fill="#a16207" stroke={INK} strokeWidth="0.6" />
        <rect x="26" y="41" width="2.6" height="14" rx="1" fill="#a16207" stroke={INK} strokeWidth="0.6" />
        <path d="M30 20l-2-4 4 1z" fill={INK} />
        {/* Rider */}
        <path d="M11 17h8l1.5 13h-11z" fill={c} stroke={INK} strokeWidth="0.6" />
        <circle cx="15" cy="12" r="4" fill={SKIN} stroke={INK} strokeWidth="0.6" />
        <path d="M10.5 10.5c0-3.5 9-3.5 9 0z" fill={c} />
        <Pip suit={suit} x={4} y={14} size={11} />
      </g>
    )
  }
  const isRey = n === 12
  return (
    <g>
      {/* Robe and legs */}
      {isRey ? (
        <path d="M11 21h14l4 34H7z" fill={c} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M11 21h14l2.5 21h-19z" fill={c} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
          <rect x="12" y="42" width="4" height="13" fill="#fde68a" stroke={INK} strokeWidth="0.6" />
          <rect x="20" y="42" width="4" height="13" fill="#fde68a" stroke={INK} strokeWidth="0.6" />
        </>
      )}
      <path d="M11 21h14v4H11z" fill="#fde68a" stroke={INK} strokeWidth="0.6" />
      {/* Head */}
      <circle cx="18" cy="14" r="5" fill={SKIN} stroke={INK} strokeWidth="0.7" />
      {isRey ? (
        <>
          <path d="M12.5 10.5l1-5 2.4 2.6L18 4l2.1 4.1 2.4-2.6 1 5z" fill="#facc15" stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M14 16.5c1 3.5 7 3.5 8 0" fill="#e5e7eb" stroke={INK} strokeWidth="0.5" />
        </>
      ) : (
        <path d="M12.5 12c0-5 11-5 11 0z" fill={c} stroke={INK} strokeWidth="0.6" />
      )}
      <Pip suit={suit} x={31} y={30} size={12} />
    </g>
  )
}

function PlayingCard({ card, top }: { card: Card; top: boolean }) {
  const c = SUIT_COLOR[card.suit]
  const label = String(card.n)
  return (
    <svg
      viewBox="0 0 60 90"
      style={{
        width: 'var(--card-w)',
        height: 'calc(var(--card-w) * 1.5)',
        flexShrink: 0,
        filter: top ? 'drop-shadow(0 0 0.35rem rgba(250, 204, 21, 0.8))' : 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.45))',
      }}
      aria-label={`${card.n} de ${card.suit}`}
    >
      <rect x="0.6" y="0.6" width="58.8" height="88.8" rx="5" fill="#fffdf6" stroke={top ? '#eab308' : '#d6d3d1'} strokeWidth={top ? 1.6 : 1} />
      {/* Inner frame line in the suit colour */}
      <rect x="4" y="4" width="52" height="82" rx="3" fill="none" stroke={c} strokeOpacity="0.5" strokeWidth="0.8" />
      {/* Corner numbers */}
      <text x="5" y="21" fontSize="20" fontWeight="900" fill={c} fontFamily="system-ui, sans-serif">{label}</text>
      <text x="5" y="21" fontSize="20" fontWeight="900" fill={c} fontFamily="system-ui, sans-serif" transform="rotate(180 30 45)">{label}</text>
      {/* Art area */}
      <svg x="13" y="19" width="34" height="54" viewBox="0 0 36 58" overflow="visible">
        {card.n >= 10
          ? <Figure n={card.n} suit={card.suit} />
          : PIP_LAYOUT[card.n].map(([x, y], i) => <Pip key={i} suit={card.suit} x={x} y={y} size={PIP_SIZE[card.n]} />)}
      </svg>
    </svg>
  )
}

function usePortrait() {
  const query = '(orientation: portrait)'
  const [portrait, setPortrait] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setPortrait(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return portrait
}

export function CardRanking({ onClose }: { onClose: () => void }) {
  const portrait = usePortrait()

  // Upright phone: lay a landscape sized box over the screen and turn it
  // 90 degrees clockwise, so the sheet reads once the phone is turned sideways
  const stageStyle: React.CSSProperties = portrait
    ? { position: 'absolute', top: 0, left: 0, width: '100dvh', height: '100dvw', transformOrigin: 'top left', transform: 'rotate(90deg) translateY(-100%)' }
    : { position: 'absolute', inset: 0 }

  return (
    <div className="modal-backdrop fixed inset-0 z-[60] bg-green-950" onClick={onClose} role="dialog" aria-label="Card order">
      <div
        style={{
          ...stageStyle,
          containerType: 'size',
          ['--card-w' as string]: 'min(5.95cqw, 15cqh)',
        }}
        className="flex items-center justify-center"
      >
        <div className="flex items-center" style={{ gap: '0.95cqw' }}>
          {TIERS.map((tier, t) => (
            <div key={t} className="flex flex-col items-center justify-center" style={{ gap: '1.6cqh' }}>
              {tier.map((card, i) => <PlayingCard key={i} card={card} top={t < 4} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
