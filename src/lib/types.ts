// Domain + row types for the Truco stats backend.

export type GameMode = '1v1' | '2v2' | 'free-for-all'

export const GAME_MODES: GameMode[] = ['1v1', '2v2', 'free-for-all']

export const MODE_LABELS: Record<GameMode, string> = {
  '1v1': '1 vs 1',
  '2v2': '2 vs 2',
  'free-for-all': 'Todos contra todos',
}

/** How many teams and players-per-team each mode uses at setup. */
export const MODE_SHAPE: Record<GameMode, { teams: number; perTeam: number }> = {
  '1v1': { teams: 2, perTeam: 1 },
  '2v2': { teams: 2, perTeam: 2 },
  'free-for-all': { teams: 3, perTeam: 1 }, // 2..4 allowed; default 3
}

export interface Player {
  id: string
  name: string
  groupId: string | null
  createdAt: string
  archivedAt: string | null
}

// ---- Flattened normalized rows returned by fetchGamesForStats() ----
export interface StatsTeam {
  teamIndex: number
  name: string | null
  finalScore: number
  isWinner: boolean
  playerIds: string[]
}

export interface StatsGame {
  id: string
  playedAt: string
  mode: GameMode
  completed: boolean
  winningScore: number
  teams: StatsTeam[]
}

// ---- Write payload for record_game RPC ----
export interface RecordGameTeamInput {
  teamIndex: number
  name: string | null
  finalScore: number
  isWinner: boolean
  playerIds: string[]
}

export interface RecordGameInput {
  mode: GameMode
  playedAt?: string
  completed: boolean
  winningScore?: number
  teams: RecordGameTeamInput[]
}
