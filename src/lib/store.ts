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
const GROUP_KEY = 'truco-group'

// ---------- Groups ----------
// Each device belongs to a group (auto-created on first launch). All games
// and player presets are tagged with the group code, so different friend
// groups using the app never see each other's data. Sharing the code lets
// several devices share one group's history.

const GROUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newGroupCode(): string {
  const rand = new Uint32Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rand)
  } else {
    for (let i = 0; i < rand.length; i++) rand[i] = Math.floor(Math.random() * 0xffffffff)
  }
  return [...rand].map(n => GROUP_ALPHABET[n % GROUP_ALPHABET.length]).join('')
}

export function getGroupId(): string {
  let id = localStorage.getItem(GROUP_KEY)
  if (!id) {
    id = newGroupCode()
    localStorage.setItem(GROUP_KEY, id)
  }
  return id
}

export function setGroupId(code: string): string {
  const normalized = code.trim().toUpperCase()
  localStorage.setItem(GROUP_KEY, normalized)
  // cached presets belong to the previous group
  localStorage.removeItem(PLAYERS_KEY)
  return normalized
}

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

// Games of the current group only (games without a tag predate groups and
// are treated as belonging to the current group)
export function loadGroupGames(): StoredGame[] {
  const group = getGroupId()
  return loadGames().filter(g => (g.groupId ?? group) === group)
}

function persistGames(games: StoredGame[]) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(games))
}

// Upserts by id: re-recording the same game (e.g. after a score correction
// while the winner banner is up) updates the existing record instead of
// creating a duplicate. The original playedAt is preserved on update.
export function recordGame(game: GameRecord) {
  const games = loadGames()
  const stored: StoredGame = { ...game, groupId: getGroupId(), synced: false }
  const idx = games.findIndex(g => g.id === game.id)
  if (idx >= 0) {
    games[idx] = { ...stored, playedAt: games[idx].playedAt }
  } else {
    games.push(stored)
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
          group_id: g.groupId ?? getGroupId(),
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
  const group = getGroupId()
  try {
    const res = await sbFetch(
      `truco_games?select=id,played_at,mode,teams,winner,completed,group_id&group_id=eq.${encodeURIComponent(group)}&order=played_at.asc`,
    )
    const remote = (await res.json()) as GameRow[]
    const local = loadGames()
    const otherGroups = local.filter(g => (g.groupId ?? group) !== group)
    const byId = new Map(local.filter(g => (g.groupId ?? group) === group).map(g => [g.id, g]))
    for (const r of remote) {
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
    const merged = [...byId.values()].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    persistGames([...otherGroups, ...merged])
    return merged
  } catch {
    return loadGroupGames()
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
  const group = getGroupId()
  try {
    const res = await sbFetch(
      `truco_players?select=name&group_id=eq.${encodeURIComponent(group)}&order=created_at.asc`,
    )
    const remote = ((await res.json()) as { name: string }[]).map(p => p.name)
    const localOnly = loadPlayers().filter(n => !remote.includes(n))
    if (localOnly.length > 0) {
      try {
        await sbFetch('truco_players?on_conflict=group_id,name', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(localOnly.map(name => ({ name, group_id: group }))),
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
    void sbFetch('truco_players?on_conflict=group_id,name', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ name, group_id: getGroupId() }]),
    }).catch(() => {})
  }
  return players
}

export function removePlayer(name: string): string[] {
  const players = loadPlayers().filter(p => p !== name)
  persistPlayers(players)
  void sbFetch(
    `truco_players?group_id=eq.${encodeURIComponent(getGroupId())}&name=eq.${encodeURIComponent(name)}`,
    { method: 'DELETE' },
  ).catch(() => {})
  return players
}
