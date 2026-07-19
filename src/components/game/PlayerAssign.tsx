import { useState } from 'react'
import type { Player } from '../../lib/types'

interface PlayerAssignProps {
  players: Player[] // active roster
  value: string | null
  usedIds: Set<string> // chosen in other slots
  onChange: (id: string | null) => void
  onQuickAdd: (name: string) => Promise<Player>
}

const NEW = '__new__'

export function PlayerAssign({ players, value, usedIds, onChange, onQuickAdd }: PlayerAssignProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const available = players.filter((p) => p.id === value || !usedIds.has(p.id))

  const quickAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      const p = await onQuickAdd(trimmed)
      onChange(p.id)
      setAdding(false)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void quickAdd()
              else if (e.key === 'Escape') setAdding(false)
            }}
            placeholder="Nuevo jugador"
            maxLength={40}
            className="flex-1 min-w-0 rounded-lg bg-green-950/40 border border-green-600 px-2 py-1.5 text-sm outline-none focus:border-yellow-500/60"
          />
          <button
            onClick={() => void quickAdd()}
            disabled={busy || !name.trim()}
            className="px-2 rounded-lg bg-yellow-500 text-green-950 font-bold text-sm disabled:opacity-40"
          >
            ✓
          </button>
          <button
            onClick={() => setAdding(false)}
            className="px-2 rounded-lg bg-green-800 border border-green-600 text-sm"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    )
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        if (v === NEW) setAdding(true)
        else onChange(v || null)
      }}
      className="w-full rounded-lg bg-green-950/40 border border-green-600 px-2 py-1.5 text-sm outline-none focus:border-yellow-500/60"
    >
      <option value="">— elegir —</option>
      {available.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
      <option value={NEW}>＋ Nuevo jugador…</option>
    </select>
  )
}
