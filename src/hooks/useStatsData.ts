import { useCallback, useEffect, useState } from 'react'
import { listPlayers } from '../lib/players'
import { fetchGamesForStats } from '../lib/games'
import type { Player, StatsGame } from '../lib/types'

interface StatsData {
  games: StatsGame[]
  players: Player[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches the full player roster (incl. archived, so historical names resolve)
 * and every game once. Stats screens aggregate from this cache client-side and
 * call refetch() after a mutation.
 */
export function useStatsData(): StatsData {
  const [games, setGames] = useState<StatsGame[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ps, gs] = await Promise.all([
        listPlayers({ includeArchived: true }),
        fetchGamesForStats(),
      ])
      setPlayers(ps)
      setGames(gs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { games, players, loading, error, refetch }
}
