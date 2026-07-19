// Pure aggregation over the fetched normalized game rows. No I/O.
// Every function is deterministic and unit-testable.

import type { GameMode, Player, StatsGame, StatsTeam } from './types'

export type Outcome = 'W' | 'L' | 'T'

export interface StatsFilters {
  playerIds?: string[] // ANY-semantics: keep game if >=1 selected player played
  dateFrom?: string // ISO; inclusive
  dateTo?: string // ISO; inclusive (end of that instant)
  modes?: GameMode[]
  includeIncomplete?: boolean // default false
}

export function playerMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]))
}

function nameOf(id: string, players: Map<string, Player>): string {
  return players.get(id)?.name ?? '¿?'
}

// --------------------------------------------------------------------------
// Filtering
// --------------------------------------------------------------------------
export function applyFilters(games: StatsGame[], f: StatsFilters): StatsGame[] {
  const from = f.dateFrom ? Date.parse(f.dateFrom) : null
  const to = f.dateTo ? Date.parse(f.dateTo) : null
  const modeSet = f.modes && f.modes.length ? new Set(f.modes) : null
  const playerSet = f.playerIds && f.playerIds.length ? new Set(f.playerIds) : null

  return games.filter((g) => {
    if (!f.includeIncomplete && !g.completed) return false
    if (modeSet && !modeSet.has(g.mode)) return false
    const t = Date.parse(g.playedAt)
    if (from !== null && t < from) return false
    if (to !== null && t > to) return false
    if (playerSet) {
      const hit = g.teams.some((tm) => tm.playerIds.some((pid) => playerSet.has(pid)))
      if (!hit) return false
    }
    return true
  })
}

/** Only completed games participate in win/loss math. */
function decidedGames(games: StatsGame[]): StatsGame[] {
  return games.filter((g) => g.completed)
}

function teamOf(game: StatsGame, playerId: string): StatsTeam | null {
  return game.teams.find((t) => t.playerIds.includes(playerId)) ?? null
}

function outcomeFor(game: StatsGame, playerId: string): Outcome | null {
  const team = teamOf(game, playerId)
  if (!team) return null
  if (team.isWinner) return 'W'
  if (game.teams.some((t) => t.isWinner)) return 'L'
  return 'T' // completed but no declared winner => draw
}

// --------------------------------------------------------------------------
// (1) Leaderboard
// --------------------------------------------------------------------------
export interface LeaderboardRow {
  playerId: string
  name: string
  archived: boolean
  games: number
  wins: number
  losses: number
  ties: number
  winPct: number // 0..1 over decided (W+L) games
  pointsFor: number
  pointsAgainst: number
  avgPointsFor: number
  pointDiff: number
}

export function computeLeaderboard(
  games: StatsGame[],
  players: Map<string, Player>,
  f: StatsFilters = {},
): LeaderboardRow[] {
  const filtered = decidedGames(applyFilters(games, f))
  const acc = new Map<string, LeaderboardRow>()

  const ensure = (id: string): LeaderboardRow => {
    let row = acc.get(id)
    if (!row) {
      const p = players.get(id)
      row = {
        playerId: id,
        name: p?.name ?? '¿?',
        archived: !!p?.archivedAt,
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winPct: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        avgPointsFor: 0,
        pointDiff: 0,
      }
      acc.set(id, row)
    }
    return row
  }

  for (const g of filtered) {
    for (const team of g.teams) {
      const rivalMax = Math.max(
        0,
        ...g.teams.filter((t) => t.teamIndex !== team.teamIndex).map((t) => t.finalScore),
      )
      const outcome = team.isWinner ? 'W' : g.teams.some((t) => t.isWinner) ? 'L' : 'T'
      for (const pid of team.playerIds) {
        const row = ensure(pid)
        row.games++
        if (outcome === 'W') row.wins++
        else if (outcome === 'L') row.losses++
        else row.ties++
        row.pointsFor += team.finalScore
        row.pointsAgainst += rivalMax
      }
    }
  }

  for (const row of acc.values()) {
    const decided = row.wins + row.losses
    row.winPct = decided > 0 ? row.wins / decided : 0
    row.avgPointsFor = row.games > 0 ? row.pointsFor / row.games : 0
    row.pointDiff = row.pointsFor - row.pointsAgainst
  }

  return [...acc.values()].sort(
    (a, b) => b.winPct - a.winPct || b.wins - a.wins || b.pointDiff - a.pointDiff,
  )
}

// --------------------------------------------------------------------------
// (2) Partnerships + head-to-head
// --------------------------------------------------------------------------
export interface PartnershipRow {
  partnerId: string
  partnerName: string
  gamesTogether: number
  wins: number
  losses: number
  ties: number
  winPct: number
}

export function computePartnerships(
  focalId: string,
  games: StatsGame[],
  players: Map<string, Player>,
  f: StatsFilters = {},
): PartnershipRow[] {
  const filtered = decidedGames(applyFilters(games, f))
  const acc = new Map<string, PartnershipRow>()

  for (const g of filtered) {
    const team = teamOf(g, focalId)
    if (!team || team.playerIds.length < 2) continue
    const outcome = outcomeFor(g, focalId)
    for (const pid of team.playerIds) {
      if (pid === focalId) continue
      let row = acc.get(pid)
      if (!row) {
        row = {
          partnerId: pid,
          partnerName: nameOf(pid, players),
          gamesTogether: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          winPct: 0,
        }
        acc.set(pid, row)
      }
      row.gamesTogether++
      if (outcome === 'W') row.wins++
      else if (outcome === 'L') row.losses++
      else row.ties++
    }
  }

  for (const row of acc.values()) {
    const decided = row.wins + row.losses
    row.winPct = decided > 0 ? row.wins / decided : 0
  }

  return [...acc.values()].sort(
    (a, b) => b.winPct - a.winPct || b.gamesTogether - a.gamesTogether,
  )
}

export interface RivalRow {
  opponentId: string
  opponentName: string
  gamesAgainst: number
  wins: number // focal beat opponent
  losses: number // opponent beat focal
  winPct: number
}

export function computeHeadToHead(
  focalId: string,
  games: StatsGame[],
  players: Map<string, Player>,
  f: StatsFilters = {},
): RivalRow[] {
  const filtered = decidedGames(applyFilters(games, f))
  const acc = new Map<string, RivalRow>()

  for (const g of filtered) {
    const team = teamOf(g, focalId)
    if (!team) continue
    const focalWon = team.isWinner
    for (const other of g.teams) {
      if (other.teamIndex === team.teamIndex) continue
      const opponentWon = other.isWinner
      for (const pid of other.playerIds) {
        let row = acc.get(pid)
        if (!row) {
          row = {
            opponentId: pid,
            opponentName: nameOf(pid, players),
            gamesAgainst: 0,
            wins: 0,
            losses: 0,
            winPct: 0,
          }
          acc.set(pid, row)
        }
        row.gamesAgainst++
        if (focalWon && !opponentWon) row.wins++
        else if (opponentWon && !focalWon) row.losses++
        // neither won (both lost to a third team) => counts as game, not W/L
      }
    }
  }

  for (const row of acc.values()) {
    const decided = row.wins + row.losses
    row.winPct = decided > 0 ? row.wins / decided : 0
  }

  return [...acc.values()].sort(
    (a, b) => b.winPct - a.winPct || b.gamesAgainst - a.gamesAgainst,
  )
}

// --------------------------------------------------------------------------
// (3) Streaks & form
// --------------------------------------------------------------------------
export interface FormStats {
  outcomes: Outcome[] // oldest -> newest
  currentStreak: { type: Outcome | 'none'; length: number }
  longestWinStreak: number
  longestLossStreak: number
  last5: Outcome[]
  last10: Outcome[]
  last5WinPct: number
  last10WinPct: number
}

function winPctOf(outcomes: Outcome[]): number {
  const w = outcomes.filter((o) => o === 'W').length
  const l = outcomes.filter((o) => o === 'L').length
  return w + l > 0 ? w / (w + l) : 0
}

export function computeForm(
  focalId: string,
  games: StatsGame[],
  f: StatsFilters = {},
): FormStats {
  const filtered = decidedGames(applyFilters(games, f)).sort(
    (a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt),
  )
  const outcomes: Outcome[] = []
  for (const g of filtered) {
    const o = outcomeFor(g, focalId)
    if (o) outcomes.push(o)
  }

  let currentStreak: FormStats['currentStreak'] = { type: 'none', length: 0 }
  if (outcomes.length) {
    const last = outcomes[outcomes.length - 1]
    let len = 0
    for (let i = outcomes.length - 1; i >= 0 && outcomes[i] === last; i--) len++
    currentStreak = { type: last, length: len }
  }

  let longestWin = 0
  let longestLoss = 0
  let runW = 0
  let runL = 0
  for (const o of outcomes) {
    if (o === 'W') {
      runW++
      runL = 0
    } else if (o === 'L') {
      runL++
      runW = 0
    } else {
      runW = 0
      runL = 0
    }
    longestWin = Math.max(longestWin, runW)
    longestLoss = Math.max(longestLoss, runL)
  }

  const last5 = outcomes.slice(-5)
  const last10 = outcomes.slice(-10)

  return {
    outcomes,
    currentStreak,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    last5,
    last10,
    last5WinPct: winPctOf(last5),
    last10WinPct: winPctOf(last10),
  }
}

// --------------------------------------------------------------------------
// (4) Trends over time
// --------------------------------------------------------------------------
export type Bucket = 'day' | 'week' | 'month'

export interface TrendPoint {
  bucketStart: string // ISO date (start of bucket)
  label: string
  games: number
  wins: number
  losses: number
  winPct: number
  cumulativeWinPct: number
  pointsForAvg: number
}

export interface TrendSeries {
  playerId: string
  name: string
  bucket: Bucket
  points: TrendPoint[]
}

function bucketStartOf(iso: string, bucket: Bucket): Date {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  if (bucket === 'day') return d
  if (bucket === 'week') {
    const day = d.getDay() // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7 // days since Monday
    d.setDate(d.getDate() - diff)
    return d
  }
  // month
  d.setDate(1)
  return d
}

function bucketLabel(d: Date, bucket: Bucket): string {
  if (bucket === 'month')
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

export function computeTrends(
  playerIds: string[],
  games: StatsGame[],
  players: Map<string, Player>,
  f: StatsFilters,
  bucket: Bucket,
): TrendSeries[] {
  const filtered = decidedGames(applyFilters(games, f)).sort(
    (a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt),
  )

  return playerIds.map((pid) => {
    const buckets = new Map<
      string,
      { start: Date; games: number; wins: number; losses: number; pointsFor: number }
    >()

    for (const g of filtered) {
      const team = teamOf(g, pid)
      if (!team) continue
      const start = bucketStartOf(g.playedAt, bucket)
      const key = start.toISOString()
      let b = buckets.get(key)
      if (!b) {
        b = { start, games: 0, wins: 0, losses: 0, pointsFor: 0 }
        buckets.set(key, b)
      }
      b.games++
      b.pointsFor += team.finalScore
      const o = outcomeFor(g, pid)
      if (o === 'W') b.wins++
      else if (o === 'L') b.losses++
    }

    const ordered = [...buckets.values()].sort((a, b) => a.start.getTime() - b.start.getTime())
    let cumW = 0
    let cumL = 0
    const points: TrendPoint[] = ordered.map((b) => {
      cumW += b.wins
      cumL += b.losses
      const decided = b.wins + b.losses
      return {
        bucketStart: b.start.toISOString(),
        label: bucketLabel(b.start, bucket),
        games: b.games,
        wins: b.wins,
        losses: b.losses,
        winPct: decided > 0 ? b.wins / decided : 0,
        cumulativeWinPct: cumW + cumL > 0 ? cumW / (cumW + cumL) : 0,
        pointsForAvg: b.games > 0 ? b.pointsFor / b.games : 0,
      }
    })

    return { playerId: pid, name: nameOf(pid, players), bucket, points }
  })
}

// --------------------------------------------------------------------------
// Shared: overall totals for the header
// --------------------------------------------------------------------------
export interface Totals {
  games: number
  completed: number
  incomplete: number
  players: number
}

export function computeTotals(games: StatsGame[], f: StatsFilters = {}): Totals {
  const filtered = applyFilters(games, { ...f, includeIncomplete: true })
  const completed = filtered.filter((g) => g.completed).length
  const ids = new Set<string>()
  for (const g of filtered) for (const t of g.teams) for (const p of t.playerIds) ids.add(p)
  return {
    games: filtered.length,
    completed,
    incomplete: filtered.length - completed,
    players: ids.size,
  }
}
