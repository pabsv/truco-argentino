import { useState } from 'react'
import type { Player } from '../../lib/types'

interface PlayerListItemProps {
  player: Player
  games: number
  onRename: (id: string, name: string) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
}

export function PlayerListItem({
  player,
  games,
  onRename,
  onArchive,
  onRestore,
}: PlayerListItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(player.name)
  const [error, setError] = useState<string | null>(null)
  const archived = !!player.archivedAt

  const commit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === player.name) {
      setEditing(false)
      setDraft(player.name)
      return
    }
    try {
      await onRename(player.id, trimmed)
      setEditing(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
        archived ? 'bg-green-950/30 border-green-800 opacity-70' : 'bg-green-900 border-green-700'
      }`}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit()
              else if (e.key === 'Escape') {
                setDraft(player.name)
                setEditing(false)
              }
            }}
            maxLength={40}
            className="w-full bg-transparent border-b border-yellow-500/60 outline-none font-semibold"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(player.name)
              setEditing(true)
            }}
            className="font-semibold truncate block text-left w-full"
          >
            {player.name}
            {archived && <span className="ml-2 text-xs text-green-400">(archivado)</span>}
          </button>
        )}
        <span className="text-xs text-green-300">{games} partidas</span>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
      {archived ? (
        <button
          onClick={() => void onRestore(player.id)}
          className="text-xs px-2 py-1 rounded bg-green-700 active:bg-green-600"
        >
          Restaurar
        </button>
      ) : (
        <button
          onClick={() => void onArchive(player.id)}
          className="text-xs px-2 py-1 rounded bg-green-800 border border-green-600 active:bg-green-700"
        >
          Archivar
        </button>
      )}
    </div>
  )
}
