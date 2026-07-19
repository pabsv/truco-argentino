import { useState } from 'react'

interface AddPlayerInputProps {
  onAdd: (name: string) => Promise<void>
}

export function AddPlayerInput({ onAdd }: AddPlayerInputProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await onAdd(trimmed)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          placeholder="Nombre del jugador"
          maxLength={40}
          autoCapitalize="words"
          className="flex-1 min-w-0 rounded-lg bg-green-950/40 border border-green-700 px-3 py-2 outline-none focus:border-yellow-500/60"
        />
        <button
          onClick={() => void submit()}
          disabled={busy || !name.trim()}
          className="px-4 py-2 rounded-lg bg-yellow-500 text-green-950 font-bold disabled:opacity-40 active:bg-yellow-400"
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
