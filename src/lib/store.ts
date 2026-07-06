// Local-first game storage with Supabase sync.
// Games and player presets are always saved to localStorage first so the app
// works offline; anything unsynced is pushed to Supabase whenever it's reachable.

export interface GameTeam {
  name: string
  players: string[]
  score: number
}

export type GameMode = '1v1' | '2v2' | 'free-for-all'

export interface GameRecord {
  id: string
  playedAt: string
  mode: GameMode
  teams: GameTeam[]
  winner: string | null
  completed: boolean
}

export interface StoredGame extends GameRecord {
  synced: boolean
}

const SUPABASE_URL = 'https://qhvmpbkgzbnislbfjlue.supabase.co'
const SUPABASE_KEY = 'sb_publishable_mu6qP2qYKcX8ERjij34Slw_fhtSjQZf'

const GAMES_KEY = 'truco-games'
const PLAYERS_KEY = 'truco-players'

async function sbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status}`)
  return res
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ---------- Games ----------

export function loadGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY)
    return raw ? (JSON.parse(raw) as StoredGame[]) : []
  } catch {
    return []
  }
}

function persistGames(games: StoredGame[]) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(games))
}

// Upserts by id: re-recording the same game (e.g. after a score correction
// while the winner banner is up) updates the existing record instead of
// creating a duplicate. The original playedAt is preserved on update.
export function recordGame(game: GameRecord) {
  const games = loadGames()
  const idx = games.findIndex(g => g.id === game.id)
  if (idx >= 0) {
    games[idx] = { ...game, playedAt: games[idx].playedAt, synced: false }
  } else {
    games.push({ ...game, synced: false })
  }
  persistGames(games)
  void syncGames()
}

interface GameRow {
  id: string
  played_at: string
  mode: GameMode
  teams: GameTeam[]
  winner: string | null
  completed: boolean
}

export async function syncGames(): Promise<void> {
  const unsynced = loadGames().filter(g => !g.synced)
  if (unsynced.length === 0) return
  try {
    await sbFetch('truco_games', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(
        unsynced.map(g => ({
          id: g.id,
          played_at: g.playedAt,
          mode: g.mode,
          teams: g.teams,
          winner: g.winner,
          completed: g.completed,
        } satisfies GameRow)),
      ),
    })
    const syncedIds = new Set(unsynced.map(g => g.id))
    persistGames(loadGames().map(g => (syncedIds.has(g.id) ? { ...g, synced: true } : g)))
  } catch {
    // Offline or Supabase unreachable — games stay queued locally and retry later.
  }
}

export async function fetchAllGames(): Promise<StoredGame[]> {
  await syncGames()
  try {
    const res = await sbFetch('truco_games?select=id,played_at,mode,teams,winner,completed&order=played_at.asc')
    const remote = (await res.json()) as GameRow[]
    const byId = new Map(loadGames().map(g => [g.id, g]))
    for (const r of remote) {
      byId.set(r.id, {
        id: r.id,
        playedAt: r.played_at,
        mode: r.mode,
        teams: r.teams,
        winner: r.winner,
        completed: r.completed,
        synced: true,
      })
    }
    const merged = [...byId.values()].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    persistGames(merged)
    return merged
  } catch {
    return loadGames()
  }
}

// ---------- Player presets ----------

export function loadPlayers(): string[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function persistPlayers(players: string[]) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

export async function fetchPlayers(): Promise<string[]> {
  try {
    const res = await sbFetch('truco_players?select=name&order=created_at.asc')
    const remote = ((await res.json()) as { name: string }[]).map(p => p.name)
    const localOnly = loadPlayers().filter(n => !remote.includes(n))
    if (localOnly.length > 0) {
      try {
        await sbFetch('truco_players?on_conflict=name', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(localOnly.map(name => ({ name }))),
        })
      } catch {
        // keep them local; they'll be pushed next time
      }
    }
    const merged = [...remote, ...localOnly]
    persistPlayers(merged)
    return merged
  } catch {
    return loadPlayers()
  }
}

export function addPlayer(name: string): string[] {
  const players = loadPlayers()
  if (!players.includes(name)) {
    players.push(name)
    persistPlayers(players)
    void sbFetch('truco_players?on_conflict=name', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ name }]),
    }).catch(() => {})
  }
  return players
}

export function removePlayer(name: string): string[] {
  const players = loadPlayers().filter(p => p !== name)
  persistPlayers(players)
  void sbFetch(`truco_players?name=eq.${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {})
  return players
}
