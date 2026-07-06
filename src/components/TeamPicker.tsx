import { useState } from 'react'

const MAX_TEAM_SIZE = 3

interface TeamPickerProps {
  defaultName: string
  currentName: string
  currentPlayers: string[]
  presets: string[]
  onAddPreset: (name: string) => void
  onRemovePreset: (name: string) => void
  onApply: (name: string, players: string[]) => void
  onClose: () => void
}

export function TeamPicker({
  defaultName,
  currentName,
  currentPlayers,
  presets,
  onAddPreset,
  onRemovePreset,
  onApply,
  onClose,
}: TeamPickerProps) {
  const [selected, setSelected] = useState<string[]>(currentPlayers.filter(p => presets.includes(p)))
  const [name, setName] = useState(currentName)
  const [editing, setEditing] = useState(false)
  const [newPlayer, setNewPlayer] = useState('')

  const togglePlayer = (player: string) => {
    let next: string[]
    if (selected.includes(player)) {
      next = selected.filter(p => p !== player)
    } else if (selected.length < MAX_TEAM_SIZE) {
      next = [...selected, player]
    } else {
      return
    }
    setSelected(next)
    setName(next.join(' y '))
  }

  const addNewPlayer = () => {
    const trimmed = newPlayer.trim()
    if (trimmed === '' || presets.includes(trimmed)) {
      setNewPlayer('')
      return
    }
    onAddPreset(trimmed)
    setNewPlayer('')
  }

  const apply = () => {
    onApply(name.trim() === '' ? defaultName : name.trim(), selected)
    onClose()
  }

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-card bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">¿Quién juega acá?</h2>
          <button
            onClick={() => setEditing(prev => !prev)}
            className={`px-2 py-1 text-xs rounded-lg border ${editing ? 'bg-yellow-500 text-green-900 border-yellow-400 font-semibold' : 'bg-green-700 border-green-600'}`}
          >
            {editing ? 'Listo' : 'Editar'}
          </button>
        </div>

        {presets.length === 0 && !editing && (
          <p className="text-sm text-green-200 mb-3">
            No hay jugadores guardados. Tocá <strong>Editar</strong> para agregar a tus amigos.
          </p>
        )}

        {/* Preset player chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(player => {
            const isSelected = selected.includes(player)
            return (
              <button
                key={player}
                onClick={() => (editing ? onRemovePreset(player) : togglePlayer(player))}
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

        {/* Add a new preset player */}
        {editing && (
          <div className="flex gap-2 mb-4">
            <input
              autoFocus
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
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg text-sm font-semibold flex-shrink-0"
            >
              Agregar
            </button>
          </div>
        )}

        {/* Team name (auto-filled from selection, still editable) */}
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
          Aplicar
        </button>
      </div>
    </div>
  )
}
