import { useEffect, useMemo, useState } from 'react'
import { fetchAllGames, loadLocalGames, type StoredGame } from '../lib/store'
import {
  buildMatchHistory,
  computeHeadToHead,
  computePlayerAggregates,
  MODE_LABELS,
  type HeadToHeadEntry,
  type MatchRowData,
  type PlayerAggregate,
} from '../lib/stats'

export function StatsScreen({ presets, onClose }: { presets: string[]; onClose: () => void }) {
  // Stale-while-revalidate: paint the local cache instantly, refresh from Supabase
  const [games, setGames] = useState<StoredGame[]>(loadLocalGames)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyLimit, setHistoryLimit] = useState(10)

  useEffect(() => {
    let cancelled = false
    fetchAllGames().then(all => {
      if (!cancelled) {
        setGames(all)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const players = useMemo(() => computePlayerAggregates(games, presets), [games, presets])
  const history = useMemo(() => buildMatchHistory(games), [games])
  const h2h = useMemo(() => (expanded ? computeHeadToHead(games, expanded) : []), [games, expanded])
  const unsyncedCount = useMemo(() => games.filter(g => !g.synced).length, [games])
  // Plain completed flag here — intentionally looser than the "decided"
  // filter that feeds PJ/PG (a completed game with no attributable winner
  // still counts as terminada).
  const completedCount = useMemo(() => games.filter(g => g.completed).length, [games])
  const abandonedCount = games.length - completedCount

  const nothingYet = games.length === 0 && presets.length === 0
  const nobodyHasStats = games.length > 0 && players.every(p => p.played === 0)

  return (
    <div className="app-fade fixed inset-0 z-50 bg-green-800 text-white flex flex-col">
      {/* Header */}
      <header
        className="bg-green-900 border-b border-green-700 flex items-center px-2 flex-shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          aria-label="Volver"
          className="w-11 h-11 flex items-center justify-center text-2xl rounded-full active:bg-green-700"
        >
          ←
        </button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-wide py-1">Estadísticas</h1>
        <span className="w-11" />
      </header>

      {/* Totals */}
      {!nothingYet && (
        <p className="text-sm text-green-200 text-center pt-2 flex-shrink-0">
          {completedCount} {completedCount === 1 ? 'terminada' : 'terminadas'}
          {abandonedCount > 0 && <> · {abandonedCount} sin terminar</>}
          {loading && <span className="text-green-400"> · actualizando…</span>}
        </p>
      )}

      {/* Scroll body */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-3"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {nothingYet ? (
          loading ? (
            <p className="text-center text-green-200 py-16">Cargando…</p>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
              <span className="text-5xl">🃏</span>
              <p className="font-bold">Todavía no hay nada por acá</p>
              <p className="text-sm text-green-200">
                Jugá tu primera partida y va a aparecer en el ranking. Tocá el nombre de un equipo
                en el tablero para decir quién juega.
              </p>
            </div>
          )
        ) : (
          <>
            {/* Ranking */}
            <div className="grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem_3rem_1.25rem] gap-x-1 text-[0.7rem] text-green-300 font-semibold px-2 pt-3 pb-1">
              <span />
              <span>Jugador</span>
              <span className="text-center">PJ</span>
              <span className="text-center">PG</span>
              <span className="text-right">%</span>
              <span />
            </div>
            <div className="space-y-1.5">
              {players.map((player, i) => (
                <PlayerRow
                  key={player.name}
                  player={player}
                  rank={i + 1}
                  expanded={expanded === player.name}
                  onToggle={() => setExpanded(prev => (prev === player.name ? null : player.name))}
                  h2h={expanded === player.name ? h2h : []}
                />
              ))}
            </div>
            {nobodyHasStats && (
              <p className="text-xs text-green-300 text-center py-2">
                Asigná jugadores tocando el nombre del equipo para sumar estadísticas.
              </p>
            )}

            {/* Match history, tucked away */}
            {history.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowHistory(prev => !prev)}
                  aria-expanded={showHistory}
                  className="w-full flex items-center justify-between py-3 px-2 rounded-xl bg-green-900/50 active:bg-green-700"
                >
                  <span className="font-semibold text-sm">Historial de partidas</span>
                  <span className="text-xs text-green-300">
                    {history.length}{' '}
                    <span className={`inline-block transition-transform ${showHistory ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </span>
                </button>
                {showHistory && (
                  <>
                    <ul className="space-y-1.5 mt-1.5">
                      {history.slice(0, historyLimit).map(row => (
                        <MatchRow key={row.game.id} row={row} />
                      ))}
                    </ul>
                    {history.length > historyLimit && (
                      <button
                        onClick={() => setHistoryLimit(prev => prev + 10)}
                        className="w-full py-2.5 mt-1.5 text-sm font-semibold bg-green-700 active:bg-green-500 rounded-lg"
                      >
                        Mostrar más
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {unsyncedCount > 0 && (
              <p className="text-xs text-orange-300 text-center mt-4">
                {unsyncedCount} {unsyncedCount === 1 ? 'partida pendiente' : 'partidas pendientes'}{' '}
                de sincronizar · se suben solas cuando haya internet
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface PlayerRowProps {
  player: PlayerAggregate
  rank: number
  expanded: boolean
  onToggle: () => void
  h2h: HeadToHeadEntry[]
}

function PlayerRow({ player, rank, expanded, onToggle, h2h }: PlayerRowProps) {
  const hasGames = player.played > 0
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className={`w-full min-h-[3.25rem] grid grid-cols-[1.75rem_1fr_2.5rem_2.5rem_3rem_1.25rem] gap-x-1 items-center px-2 py-2 text-left transition active:bg-green-700 ${
          expanded ? 'bg-green-900 rounded-t-xl' : 'bg-green-900/50 rounded-xl'
        } ${hasGames ? '' : 'opacity-60'}`}
      >
        <span className="text-green-300 font-bold text-sm">
          {hasGames ? (rank === 1 ? '👑' : rank) : ''}
        </span>
        <span className="font-semibold text-base truncate">{player.name}</span>
        <span className="text-center text-sm text-green-100">{player.played}</span>
        <span className="text-center text-sm font-bold text-yellow-400">{player.wins}</span>
        <span className={`text-right text-sm ${hasGames ? '' : 'text-green-400'}`}>
          {hasGames ? `${Math.round(player.winPct)}%` : '—'}
        </span>
        <span className={`text-green-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="bg-green-900/70 rounded-b-xl px-3 pt-2 pb-3 border-t border-green-700/50">
          {player.lastResults.length > 0 && <FormDots results={player.lastResults} />}
          <p className="text-[0.7rem] text-green-300 font-semibold mt-2 mb-1">Mano a mano</p>
          {h2h.length > 0 ? (
            h2h.map(entry => (
              <div key={entry.opponent} className="flex items-center justify-between py-1.5 text-sm">
                <span className="truncate">
                  <span className="text-green-400">vs </span>
                  <span className="font-semibold">{entry.opponent}</span>
                </span>
                <span className="flex-shrink-0">
                  <span
                    className={`font-bold tabular-nums ${
                      entry.wins > entry.opponentWins
                        ? 'text-yellow-400'
                        : entry.wins === entry.opponentWins
                          ? 'text-green-100'
                          : 'text-green-300'
                    }`}
                  >
                    {entry.wins}–{entry.opponentWins}
                  </span>
                  <span className="text-[0.7rem] text-green-400"> · {entry.played} PJ</span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-green-300 italic py-1">
              Todavía no jugó contra nadie. ¡Que se siente a la mesa!
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FormDots({ results }: { results: boolean[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] text-green-300 font-semibold">Últimas {results.length}</span>
      <span className="flex gap-1">
        {results.map((win, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              win ? 'bg-yellow-400' : 'border border-green-500 bg-transparent'
            }`}
          />
        ))}
      </span>
    </div>
  )
}

function MatchRow({ row }: { row: MatchRowData }) {
  const { game, winnerIndex } = row
  return (
    <li className="text-xs bg-green-800/60 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-green-300 flex-shrink-0">
          {new Date(game.playedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
        </span>
        <span className="text-green-400 flex-shrink-0">{MODE_LABELS[game.mode]}</span>
        {!game.completed && <span className="text-orange-300 flex-shrink-0">sin terminar</span>}
      </div>
      <div className="mt-0.5">
        {game.teams.map((team, i) => (
          <span key={i}>
            {i > 0 && <span className="text-green-400"> — </span>}
            <span className={i === winnerIndex ? 'text-yellow-400 font-semibold' : ''}>
              {team.name} {team.score}
              {i === winnerIndex && ' 🏆'}
            </span>
          </span>
        ))}
      </div>
    </li>
  )
}
