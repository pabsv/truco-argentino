import { useState } from 'react'
import type { GameSession } from '../../hooks/useGameSession'
import { recordGame } from '../../lib/games'
import type { RecordGameInput } from '../../lib/types'

interface RecordGameBarProps {
  session: GameSession
  winnerIndex: number
  onSaved: () => void
  onDiscard: () => void
}

export function RecordGameBar({ session, winnerIndex, onSaved, onDiscard }: RecordGameBarProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAssigned = session.teams.every((t) => t.playerIds.length > 0)

  const save = async () => {
    if (busy || !allAssigned) return
    setBusy(true)
    setError(null)
    const input: RecordGameInput = {
      mode: session.mode,
      completed: true,
      winningScore: session.winningScore,
      teams: session.teams.map((t, i) => ({
        teamIndex: i,
        name: t.name,
        finalScore: session.scores[i] ?? 0,
        isWinner: i === winnerIndex,
        playerIds: t.playerIds,
      })),
    }
    try {
      await recordGame(input)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-300 text-center">{error}</p>}
      {!allAssigned && (
        <p className="text-xs text-yellow-300 text-center">
          Asigná jugadores a todos los equipos para guardar la partida.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onDiscard}
          className="flex-1 py-2.5 rounded-lg bg-green-700 active:bg-green-600 font-semibold"
        >
          Descartar
        </button>
        <button
          onClick={() => void save()}
          disabled={busy || !allAssigned}
          className="flex-[2] py-2.5 rounded-lg bg-yellow-500 text-green-950 font-bold active:bg-yellow-400 disabled:opacity-40"
        >
          {busy ? 'Guardando…' : 'Guardar partida'}
        </button>
      </div>
    </div>
  )
}
