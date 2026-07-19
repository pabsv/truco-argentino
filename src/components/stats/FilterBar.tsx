import type { Player, GameMode } from '../../lib/types'
import { GAME_MODES, MODE_LABELS } from '../../lib/types'
import type { StatsFilters } from '../../lib/stats'

interface FilterBarProps {
  players: Player[] // active players to offer as chips
  filters: StatsFilters
  onChange: (next: StatsFilters) => void
}

type Preset = { key: string; label: string; days: number | null }
const PRESETS: Preset[] = [
  { key: 'all', label: 'Todo', days: null },
  { key: '90', label: '90 días', days: 90 },
  { key: '30', label: '30 días', days: 30 },
  { key: '7', label: '7 días', days: 7 },
]

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function activePreset(filters: StatsFilters): string {
  if (!filters.dateFrom) return 'all'
  for (const p of PRESETS) {
    if (p.days && filters.dateFrom === daysAgoIso(p.days)) return p.key
  }
  return 'custom'
}

export function FilterBar({ players, filters, onChange }: FilterBarProps) {
  const selectedPlayers = new Set(filters.playerIds ?? [])
  const selectedModes = new Set(filters.modes ?? [])
  const preset = activePreset(filters)

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayers)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...filters, playerIds: [...next] })
  }

  const toggleMode = (m: GameMode) => {
    const next = new Set(selectedModes)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    onChange({ ...filters, modes: [...next] })
  }

  const setPreset = (p: Preset) => {
    onChange({ ...filters, dateFrom: p.days ? daysAgoIso(p.days) : undefined, dateTo: undefined })
  }

  const anyFilter =
    (filters.playerIds?.length ?? 0) > 0 ||
    (filters.modes?.length ?? 0) > 0 ||
    !!filters.dateFrom

  return (
    <div className="rounded-xl bg-green-900 border border-green-700 p-3 flex flex-col gap-3">
      {/* Players */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-green-300">Jugadores</span>
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => {
            const on = selectedPlayers.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                  on
                    ? 'bg-yellow-500 text-green-950 border-yellow-500 font-semibold'
                    : 'bg-green-950/30 text-green-100 border-green-700'
                }`}
              >
                {p.name}
              </button>
            )
          })}
          {players.length === 0 && (
            <span className="text-sm text-green-400">Sin jugadores todavía</span>
          )}
        </div>
      </div>

      {/* Mode + date */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-green-300">Modo</span>
          <div className="flex gap-1.5">
            {GAME_MODES.map((m) => {
              const on = selectedModes.has(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-sm border ${
                    on
                      ? 'bg-green-600 border-green-400 font-semibold'
                      : 'bg-green-950/30 border-green-700 text-green-200'
                  }`}
                >
                  {m === 'free-for-all' ? 'Todos' : MODE_LABELS[m]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-green-300">Período</span>
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-sm border ${
                  preset === p.key
                    ? 'bg-green-600 border-green-400 font-semibold'
                    : 'bg-green-950/30 border-green-700 text-green-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {anyFilter && (
        <button
          onClick={() => onChange({ ...filters, playerIds: [], modes: [], dateFrom: undefined, dateTo: undefined })}
          className="self-start text-xs text-green-300 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
