import { useState } from 'react'

interface EditableTeamNameProps {
  name: string
  defaultName: string
  onChange: (next: string) => void
}

export function EditableTeamName({ name, defaultName, onChange }: EditableTeamNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const commit = () => {
    const trimmed = draft.trim()
    onChange(trimmed === '' ? defaultName : trimmed)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(name)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') cancel()
        }}
        onFocus={e => e.target.select()}
        maxLength={12}
        inputMode="text"
        autoCapitalize="words"
        className="w-full text-base font-semibold text-center bg-transparent border-b border-yellow-500/60 outline-none"
      />
    )
  }

  return (
    <h2
      onClick={() => { setDraft(name); setEditing(true) }}
      className="text-base font-semibold cursor-pointer truncate px-2"
    >
      {name}
    </h2>
  )
}
