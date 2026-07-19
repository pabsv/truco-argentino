import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { PlayerAssign } from '../components/game/PlayerAssign'
import { listPlayers, addPlayer } from '../lib/players'
import { GAME_MODES, MODE_LABELS, MODE_SHAPE } from '../lib/types'
import type { GameMode, Player } from '../lib/types'
import { useGameSession } from '../hooks/useGameSession'

function emptySlots(mode: GameMode, teamCount: number): (string | null)[][] {
  const { perTeam } = MODE_SHAPE[mode]
  const teams = mode === 'free-for-all' ? teamCount : MODE_SHAPE[mode].teams
  return Array.from({ length: teams }, () => Array.from({ length: perTeam }, () => null))
}

export function NewGameSetup() {
  const navigate = useNavigate()
  const { start } = useGameSession()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState<GameMode>('2v2')
  const [ffaTeams, setFfaTeams] = useState(3)
  const [winningScore, setWinningScore] = useState(30)
  const [slots, setSlots] = useState<(string | null)[][]>(() => emptySlots('2v2', 3))

  useEffect(() => {
    listPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false))
  }, [])

  const changeMode = (m: GameMode) => {
    setMode(m)
    setSlots(emptySlots(m, ffaTeams))
  }
  const changeFfaTeams = (n: number) => {
    setFfaTeams(n)
    setSlots(emptySlots('free-for-all', n))
  }

  const usedIds = useMemo(() => {
    const s = new Set<string>()
    for (const team of slots) for (const id of team) if (id) s.add(id)
    return s
  }, [slots])

  const setSlot = (ti: number, si: number, id: string | null) => {
    setSlots((prev) => prev.map((team, i) => (i === ti ? team.map((v, j) => (j === si ? id : v)) : team)))
  }

  const quickAdd = async (name: string): Promise<Player> => {
    const p = await addPlayer(name)
    setPlayers((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
    return p
  }

  const allFilled = slots.every((team) => team.every((id) => id != null))

  const begin = () => {
    if (!allFilled) return
    const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '¿?'
    const teams = slots.map((team) => {
      const ids = team.filter((id): id is string => !!id)
      return { name: ids.map(nameOf).join(' y '), playerIds: ids }
    })
    start({ mode, winningScore, teams })
    navigate('/')
  }

  return (
    <PageShell title="Nueva partida">
      <div className="flex flex-col gap-4">
        {/* Mode */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wide text-green-300">Modo</span>
          <div className="grid grid-cols-3 gap-2">
            {GAME_MODES.map((m) => (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={`py-2 rounded-lg text-sm border ${
                  mode === m
                    ? 'bg-yellow-500 text-green-950 border-yellow-500 font-bold'
                    : 'bg-green-900 border-green-700'
                }`}
              >
                {m === 'free-for-all' ? 'Todos' : MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {mode === 'free-for-all' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-300">Equipos:</span>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => changeFfaTeams(n)}
                  className={`w-8 h-8 rounded-lg border ${
                    ffaTeams === n ? 'bg-green-600 border-green-400 font-bold' : 'bg-green-900 border-green-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Winning score */}
        <section className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-green-300">A</span>
          {[15, 30].map((s) => (
            <button
              key={s}
              onClick={() => setWinningScore(s)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                winningScore === s ? 'bg-green-600 border-green-400 font-bold' : 'bg-green-900 border-green-700'
              }`}
            >
              {s} puntos
            </button>
          ))}
        </section>

        {/* Teams */}
        <section className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-green-300">Cargando jugadores…</p>
          ) : (
            slots.map((team, ti) => (
              <div key={ti} className="rounded-xl bg-green-900 border border-green-700 p-3 flex flex-col gap-2">
                <span className="text-sm font-semibold text-yellow-400">
                  {mode === 'free-for-all' ? `Jugador ${ti + 1}` : `Equipo ${ti + 1}`}
                </span>
                {team.map((id, si) => (
                  <PlayerAssign
                    key={si}
                    players={players}
                    value={id}
                    usedIds={usedIds}
                    onChange={(v) => setSlot(ti, si, v)}
                    onQuickAdd={quickAdd}
                  />
                ))}
              </div>
            ))
          )}
        </section>

        <button
          onClick={begin}
          disabled={!allFilled}
          className="py-3 rounded-xl bg-yellow-500 text-green-950 font-bold text-lg active:bg-yellow-400 disabled:opacity-40"
        >
          Empezar
        </button>
        {!allFilled && !loading && (
          <p className="text-xs text-green-300 text-center -mt-2">
            Asigná todos los jugadores para empezar.
          </p>
        )}
      </div>
    </PageShell>
  )
}
