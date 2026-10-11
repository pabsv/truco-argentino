import { useState } from 'react'

interface TeamPickerProps {
  defaultName: string
  currentName: string
  players: string[]
  onPlayersChange: (players: string[]) => void
  onApply: (name: string) => void
  onClose: () => void
}

export function TeamPicker({ defaultName, currentName, players, onPlayersChange, onApply, onClose }: TeamPickerProps) {
  // Pre-select saved players already in the current team name ("Pablo y Juan")
  const [selected, setSelected] = useState<string[]>(() => {
    const parts = currentName.split(/\s+y\s+/)
    return parts.filter(p => players.includes(p))
  })
  const [name, setName] = useState(currentName === defaultName ? '' : currentName)
  const [editing, setEditing] = useState(false)
  const [newPlayer, setNewPlayer] = useState('')

  const selectPlayers = (next: string[]) => {
    setSelected(next)
    setName(next.join(' y '))
  }

  const togglePlayer = (player: string) => {
    selectPlayers(selected.includes(player) ? selected.filter(p => p !== player) : [...selected, player])
  }

  const addNewPlayer = () => {
    const trimmed = newPlayer.trim()
    setNewPlayer('')
    if (trimmed === '') return
    if (!players.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      onPlayersChange([...players, trimmed])
    }
    // Adding someone usually means they're playing now
    const existing = players.find(p => p.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    if (!selected.includes(existing)) selectPlayers([...selected, existing])
  }

  const removePlayer = (player: string) => {
    onPlayersChange(players.filter(p => p !== player))
    if (selected.includes(player)) selectPlayers(selected.filter(p => p !== player))
  }

  const apply = () => {
    const trimmed = name.trim()
    onApply(trimmed === '' ? defaultName : trimmed)
    onClose()
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">¿Quién juega?</h2>
          {players.length > 0 && (
            <button
              onClick={() => setEditing(prev => !prev)}
              className={`px-2 py-1 text-xs rounded-lg border ${editing ? 'bg-yellow-500 text-green-900 border-yellow-400 font-semibold' : 'bg-green-700 border-green-600'}`}
            >
              {editing ? 'Listo' : 'Editar'}
            </button>
          )}
        </div>

        {players.length === 0 && (
          <p className="text-sm text-green-200 mb-3">
            Todavía no hay jugadores guardados. Agregá a tus amigos abajo y quedan guardados en este teléfono.
          </p>
        )}

        {players.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {players.map(player => {
              const isSelected = selected.includes(player)
              return (
                <button
                  key={player}
                  onClick={() => (editing ? removePlayer(player) : togglePlayer(player))}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition active:scale-95 ${
                    isSelected && !editing
                      ? 'bg-yellow-500 text-green-900 border-yellow-400'
                      : 'bg-green-700 border-green-600 hover:bg-green-600'
                  }`}
                >
                  {player}
                  {editing && <span className="ml-1.5 text-red-300">×</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Add a player to the saved list */}
        <div className="flex gap-2 mb-4">
          <input
            value={newPlayer}
            onChange={e => setNewPlayer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addNewPlayer() }}
            placeholder="Nuevo jugador"
            maxLength={12}
            autoCapitalize="words"
            className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-green-800 border border-green-600 rounded-lg outline-none focus:border-yellow-500"
          />
          <button
            onClick={addNewPlayer}
            disabled={newPlayer.trim() === ''}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-40"
          >
            + Guardar
          </button>
        </div>

        {/* Team name: filled from the chips, still free to type */}
        <label className="block text-xs text-green-300 mb-1">Nombre del equipo</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') apply() }}
          placeholder={defaultName}
          maxLength={24}
          autoCapitalize="words"
          className="w-full px-3 py-2 mb-4 bg-green-800 border border-green-600 rounded-lg outline-none focus:border-yellow-500 font-semibold"
        />

        <button
          onClick={apply}
          className="w-full py-2.5 bg-yellow-500 text-green-900 hover:bg-yellow-400 active:bg-yellow-300 rounded-lg font-bold transition active:scale-[0.98]"
        >
          Listo
        </button>
      </div>
    </div>
  )
}
