const PLAYERS_KEY = 'truco-players'

// Saved players live only on this device. Starts empty; the user builds the list.
export function loadPlayers(): string[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function savePlayers(players: string[]) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
  } catch {
    // storage full or blocked: the list just won't persist
  }
}
