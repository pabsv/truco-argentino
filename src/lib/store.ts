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
  groupId?: string
  synced: boolean
}

const SUPABASE_URL = 'https://qhvmpbkgzbnislbfjlue.supabase.co'
const SUPABASE_KEY = 'sb_publishable_mu6qP2qYKcX8ERjij34Slw_fhtSjQZf'

const GAMES_KEY = 'truco-games'
const PLAYERS_KEY = 'truco-players'

// All writes land in one shared pool. Historical rows live under many old
// random group codes; reads ignore group_id entirely so every install sees
// everything. 'default' is only a write-side tag, never a filter.
const DEFAULT_GROUP = 'default'

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

function loadGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY)
    return raw ? (JSON.parse(raw) as StoredGame[]) : []
  } catch {
    return []
  }
}

// All locally cached games, regardless of which group they were recorded under.
export function loadLocalGames(): StoredGame[] {
  return loadGames()
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
    // Also preserve the original groupId — never re-tag a historical row.
    games[idx] = { ...game, playedAt: games[idx].playedAt, groupId: games[idx].groupId ?? DEFAULT_GROUP, synced: false }
  } else {
    games.push({ ...game, groupId: DEFAULT_GROUP, synced: false })
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
  group_id: string
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
          group_id: g.groupId ?? DEFAULT_GROUP,
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
    const res = await sbFetch(
      'truco_games?select=id,played_at,mode,teams,winner,completed,group_id&order=played_at.asc&limit=1000',
    )
    const remote = (await res.json()) as GameRow[]
    const byId = new Map(loadGames().map(g => [g.id, g]))
    for (const r of remote) {
      const existing = byId.get(r.id)
      if (existing && !existing.synced) continue // local unsynced edit wins; pushes next sync
      byId.set(r.id, {
        id: r.id,
        playedAt: r.played_at,
        mode: r.mode,
        teams: r.teams,
        winner: r.winner,
        completed: r.completed,
        groupId: r.group_id,
        synced: true,
      })
    }
    // Date.parse instead of string comparison: local records store "...Z"
    // while PostgREST returns "+00:00" offsets, which don't sort as text.
    const merged = [...byId.values()].sort(
      (a, b) => (Date.parse(a.playedAt) || 0) - (Date.parse(b.playedAt) || 0),
    )
    persistGames(merged)
    return merged
  } catch {
    return loadLocalGames()
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
    const res = await sbFetch('truco_players?select=name&order=created_at.asc&limit=1000')
    const rows = (await res.json()) as { name: string }[]
    // The same name can exist under several old group_ids (and with stray
    // whitespace) — dedupe on the trimmed name, keeping first-seen order.
    const seen = new Set<string>()
    const remote: string[] = []
    for (const row of rows) {
      const name = row.name.trim()
      if (name !== '' && !seen.has(name)) {
        seen.add(name)
        remote.push(name)
      }
    }
    const localOnly: string[] = []
    for (const raw of loadPlayers()) {
      const name = raw.trim()
      if (name !== '' && !seen.has(name)) {
        seen.add(name)
        localOnly.push(name)
      }
    }
    if (localOnly.length > 0) {
      try {
        await sbFetch('truco_players?on_conflict=group_id,name', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(localOnly.map(name => ({ name, group_id: DEFAULT_GROUP }))),
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
  const trimmed = name.trim()
  const players = loadPlayers()
  if (trimmed !== '' && !players.includes(trimmed)) {
    players.push(trimmed)
    persistPlayers(players)
    void sbFetch('truco_players?on_conflict=group_id,name', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ name: trimmed, group_id: DEFAULT_GROUP }]),
    }).catch(() => {})
  }
  return players
}

export function removePlayer(name: string): string[] {
  const players = loadPlayers().filter(p => p !== name)
  persistPlayers(players)
  // No group filter: the name may exist under several old group_ids; delete
  // all of them or fetchPlayers will resurrect it from a stale group row.
  void sbFetch(`truco_players?name=eq.${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(
    () => {},
  )
  return players
}
