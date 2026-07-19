import { supabase } from './supabase'
import type { GameMode, RecordGameInput, StatsGame, StatsTeam } from './types'

/** Insert a game + its teams + participants atomically via the record_game RPC. */
export async function recordGame(input: RecordGameInput): Promise<string> {
  const { data, error } = await supabase.rpc('record_game', { payload: input })
  if (error) throw error
  return data as string
}

interface GameRow {
  id: string
  played_at: string
  mode: GameMode
  completed: boolean
  winning_score: number
  game_teams: {
    team_index: number
    name: string | null
    final_score: number
    is_winner: boolean
    game_participants: { player_id: string }[]
  }[]
}

function mapGame(r: GameRow): StatsGame {
  const teams: StatsTeam[] = (r.game_teams ?? [])
    .map((t) => ({
      teamIndex: t.team_index,
      name: t.name,
      finalScore: t.final_score,
      isWinner: t.is_winner,
      playerIds: (t.game_participants ?? []).map((p) => p.player_id),
    }))
    .sort((a, b) => a.teamIndex - b.teamIndex)

  return {
    id: r.id,
    playedAt: r.played_at,
    mode: r.mode,
    completed: r.completed,
    winningScore: r.winning_score,
    teams,
  }
}

/** One round-trip: every game with its teams + participant player ids, oldest first. */
export async function fetchGamesForStats(): Promise<StatsGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `id, played_at, mode, completed, winning_score,
       game_teams ( team_index, name, final_score, is_winner,
         game_participants ( player_id ) )`,
    )
    .order('played_at', { ascending: true })

  if (error) throw error
  return (data as GameRow[]).map(mapGame)
}

/** Delete a game (cascades to teams + participants). Used to undo a mistaken record. */
export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) throw error
}
