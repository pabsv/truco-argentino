// Pure stat computation over the stored game history. No I/O, no React —
// everything here is derivable from StoredGame[] alone.

import type { GameMode, StoredGame } from './store'

export const MODE_LABELS: Record<GameMode, string> = {
  '1v1': '1 vs 1',
  '2v2': 'Equipos',
  'free-for-all': '3 jugadores',
}

// Index into game.teams of the winning team; null = no attributable winner.
// Derived from scores rather than the stored winner name, which goes stale
// when a team is renamed and is ambiguous when two teams share a name.
export function winnerIndex(game: Pick<StoredGame, 'teams' | 'winner' | 'completed'>): number | null {
  if (!game.completed) return null
  const winnerName = (game.winner ?? '').trim()

  const atThirty = game.teams.reduce<number[]>((acc, t, i) => (t.score >= 30 ? [...acc, i] : acc), [])
  if (atThirty.length === 1) return atThirty[0]
  if (atThirty.length > 1) {
    return atThirty.find(i => game.teams[i].name.trim() === winnerName) ?? atThirty[0]
  }

  if (winnerName !== '') {
    const byName = game.teams.reduce<number[]>(
      (acc, t, i) => (t.name.trim() === winnerName ? [...acc, i] : acc),
      [],
    )
    if (byName.length === 1) return byName[0]
    if (byName.length > 1) {
      return byName.reduce((best, i) => (game.teams[i].score > game.teams[best].score ? i : best))
    }
  }

  // Last resort: a strict unique maximum score. A shared max (or an all-zero
  // board) is not evidence of anything.
  const max = Math.max(...game.teams.map(t => t.score))
  const atMax = game.teams.reduce<number[]>((acc, t, i) => (t.score === max ? [...acc, i] : acc), [])
  if (max > 0 && atMax.length === 1) return atMax[0]
  return null
}

export function canonicalPlayer(raw: string): string {
  return raw.trim()
}

// Map canonical name -> set of team indices the player appears on in this game.
export function gameRoster(game: Pick<StoredGame, 'teams'>): Map<string, Set<number>> {
  const roster = new Map<string, Set<number>>()
  game.teams.forEach((team, i) => {
    for (const raw of team.players) {
      const name = canonicalPlayer(raw)
      if (name === '') continue
      const indices = roster.get(name) ?? new Set<number>()
      indices.add(i)
      roster.set(name, indices)
    }
  })
  return roster
}

// Decided games only — completed with an attributable winner — oldest first.
// Date.parse instead of string comparison: local records store "...Z" while
// PostgREST returns "+00:00" offsets, and those don't sort together as text.
function decidedGames(games: StoredGame[]): { game: StoredGame; winner: number }[] {
  return games
    .map(game => ({ game, winner: winnerIndex(game) }))
    .filter((entry): entry is { game: StoredGame; winner: number } => entry.winner !== null)
    .sort((a, b) => (Date.parse(a.game.playedAt) || 0) - (Date.parse(b.game.playedAt) || 0))
}

export interface PlayerAggregate {
  name: string
  played: number // decided games the player appears in
  wins: number // ...where their team won
  winPct: number
  lastResults: boolean[] // ≤5 most recent decided games, oldest→newest, true = win
}

export function computePlayerAggregates(games: StoredGame[], presetPlayers: string[]): PlayerAggregate[] {
  // A player listed on more than one team (or twice on one) still counts the
  // game exactly once: the roster already collapses them to one entry.
  const results = new Map<string, boolean[]>()
  for (const { game, winner } of decidedGames(games)) {
    for (const [name, teams] of gameRoster(game)) {
      const list = results.get(name) ?? []
      list.push(teams.has(winner))
      results.set(name, list)
    }
  }

  const aggregates = new Map<string, PlayerAggregate>()
  for (const [name, list] of results) {
    const wins = list.filter(Boolean).length
    aggregates.set(name, {
      name,
      played: list.length,
      wins,
      winPct: (wins / list.length) * 100,
      lastResults: list.slice(-5),
    })
  }
  for (const raw of presetPlayers) {
    const name = canonicalPlayer(raw)
    if (name !== '' && !aggregates.has(name)) {
      aggregates.set(name, { name, played: 0, wins: 0, winPct: 0, lastResults: [] })
    }
  }

  return [...aggregates.values()].sort((a, b) => {
    if (a.played > 0 !== b.played > 0) return a.played > 0 ? -1 : 1
    if (a.played === 0) return a.name.localeCompare(b.name, 'es')
    return b.wins - a.wins || b.winPct - a.winPct || b.played - a.played || a.name.localeCompare(b.name, 'es')
  })
}

export interface HeadToHeadEntry {
  opponent: string
  played: number // decided games with both players on opposing teams
  wins: number // ...where the subject player's team won
  opponentWins: number // ...where the opponent's team won
  // 1v1/2v2: wins + opponentWins === played. In free-for-all a third team can
  // win, so wins + opponentWins <= played — a rival who didn't win the game
  // never gets credited with beating you.
}

export function computeHeadToHead(games: StoredGame[], player: string): HeadToHeadEntry[] {
  const subject = canonicalPlayer(player)
  const entries = new Map<string, HeadToHeadEntry>()
  for (const { game, winner } of decidedGames(games)) {
    const roster = gameRoster(game)
    const mine = roster.get(subject)
    if (!mine) continue
    for (const [opponent, theirs] of roster) {
      if (opponent === subject) continue
      // Rivals only when the team sets are fully disjoint; sharing any team
      // makes the pair partners for this game, which counts for nothing here.
      if ([...theirs].some(t => mine.has(t))) continue
      const entry = entries.get(opponent) ?? { opponent, played: 0, wins: 0, opponentWins: 0 }
      entry.played += 1
      if (mine.has(winner)) entry.wins += 1
      else if (theirs.has(winner)) entry.opponentWins += 1
      entries.set(opponent, entry)
    }
  }
  return [...entries.values()].sort(
    (a, b) => b.played - a.played || b.wins - a.wins || a.opponent.localeCompare(b.opponent, 'es'),
  )
}

export interface MatchRowData {
  game: StoredGame
  winnerIndex: number | null
}

// Full history, newest first, completed and abandoned alike.
export function buildMatchHistory(games: StoredGame[]): MatchRowData[] {
  return games
    .map(game => ({ game, winnerIndex: winnerIndex(game) }))
    .sort((a, b) => (Date.parse(b.game.playedAt) || 0) - (Date.parse(a.game.playedAt) || 0))
}
