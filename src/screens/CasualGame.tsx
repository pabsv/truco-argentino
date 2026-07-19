import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ScorePanel } from '../components/ScorePanel'
import { InfoModal } from '../components/InfoModal'
import { RecordGameBar } from '../components/game/RecordGameBar'
import { useGameSession } from '../hooks/useGameSession'
import { MODE_LABELS } from '../lib/types'

export function CasualGame() {
  const { session, adjustScore, resetScores, clear, winnerIndex } = useGameSession()
  const [showInfo, setShowInfo] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 bg-green-800 text-white p-6 text-center">
        <img src="/anchobasto.jpg" alt="Ancho de Basto" className="h-20 w-auto rounded-lg" />
        <div>
          <h1 className="text-2xl font-bold">Truco</h1>
          <p className="text-green-300 mt-1">No hay partida activa.</p>
        </div>
        <Link
          to="/new"
          className="px-6 py-3 rounded-xl bg-yellow-500 text-green-950 font-bold text-lg active:bg-yellow-400"
        >
          Nueva partida
        </Link>
      </div>
    )
  }

  const compact = session.teams.length > 2
  const winnerName = winnerIndex >= 0 ? session.teams[winnerIndex]?.name : null

  const onSaved = () => {
    resetScores()
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  return (
    <div className="h-full bg-green-800 flex flex-col text-white overflow-hidden touch-none min-h-0">
      <header
        className="bg-green-900 px-3 border-b border-green-700 flex-shrink-0 flex items-center justify-between"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <Link
          to="/new"
          className="px-2 h-7 text-xs font-bold rounded-full bg-green-600 border border-green-500 flex items-center justify-center"
        >
          Nueva
        </Link>
        <div className="flex items-center gap-2 py-1">
          <img src="/anchobasto.jpg" alt="Ancho de Basto" className="h-8 w-auto rounded" />
          <div className="flex flex-col leading-none">
            <h1 className="text-lg font-bold tracking-wide">Truco</h1>
            <span className="text-[10px] text-green-300">
              {MODE_LABELS[session.mode]} · a {session.winningScore}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(true)}
          className="w-7 h-7 text-xs font-bold rounded-full bg-green-600 border border-green-500 flex items-center justify-center flex-shrink-0"
        >
          ?
        </button>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0">
          {session.teams.map((team, i) => (
            <div
              key={i}
              className={`flex-1 flex flex-col min-h-0 ${i > 0 ? 'border-l border-green-700' : ''}`}
            >
              <div className="bg-green-900/50 py-1.5 px-1 text-center border-b border-green-700 flex-shrink-0">
                <h2 className="text-sm font-semibold truncate">{team.name}</h2>
              </div>
              <ScorePanel
                score={session.scores[i] ?? 0}
                onIncrement={() => adjustScore(i, 1)}
                onDecrement={() => adjustScore(i, -1)}
                compact={compact}
              />
            </div>
          ))}
        </div>

        <div
          className="px-3 pt-3 bg-green-900 border-t border-green-700 flex-shrink-0"
          style={{ paddingBottom: '0.75rem' }}
        >
          {winnerIndex >= 0 ? (
            <RecordGameBar
              session={session}
              winnerIndex={winnerIndex}
              onSaved={onSaved}
              onDiscard={resetScores}
            />
          ) : (
            <div className="flex gap-2">
              <button
                onClick={resetScores}
                className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold transition-colors"
              >
                Reiniciar marcador
              </button>
              <button
                onClick={clear}
                className="px-4 py-2.5 bg-green-800 border border-green-600 rounded-lg font-semibold active:bg-green-700"
              >
                Terminar
              </button>
            </div>
          )}
        </div>
      </main>

      {winnerName && (
        <div className="fixed left-4 right-4 z-50" style={{ top: 'calc(env(safe-area-inset-top) + 3rem)' }}>
          <div className="bg-yellow-500 text-green-900 rounded-lg px-4 py-2 text-center font-bold shadow-lg flex items-center justify-center gap-2">
            <span>🏆</span>
            <span>¡{winnerName} ganan!</span>
          </div>
        </div>
      )}

      {savedToast && (
        <div className="fixed left-4 right-4 z-50" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
          <div className="bg-green-600 text-white rounded-lg px-4 py-2 text-center font-semibold shadow-lg">
            ✓ Partida guardada
          </div>
        </div>
      )}

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  )
}
