import { useCallback, useEffect, useState } from 'react'
import type { GameMode } from '../lib/types'

const KEY = 'truco-session'

export interface SessionTeam {
  name: string
  playerIds: string[] // empty allowed for a quick unrecorded game
}

export interface GameSession {
  mode: GameMode
  winningScore: number
  teams: SessionTeam[]
  scores: number[]
  startedAt: string
}

function load(): GameSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as GameSession
    if (!Array.isArray(s.teams) || !Array.isArray(s.scores)) return null
    return s
  } catch {
    return null
  }
}

export function useGameSession() {
  const [session, setSession] = useState<GameSession | null>(load)

  useEffect(() => {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  }, [session])

  const start = useCallback(
    (input: { mode: GameMode; winningScore?: number; teams: SessionTeam[] }) => {
      setSession({
        mode: input.mode,
        winningScore: input.winningScore ?? 30,
        teams: input.teams,
        scores: input.teams.map(() => 0),
        startedAt: new Date().toISOString(),
      })
    },
    [],
  )

  const adjustScore = useCallback((teamIndex: number, delta: number) => {
    setSession((prev) => {
      if (!prev) return prev
      const max = prev.winningScore
      const scores = prev.scores.map((s, i) =>
        i === teamIndex ? Math.max(0, Math.min(max, s + delta)) : s,
      )
      return { ...prev, scores }
    })
    if (navigator.vibrate) navigator.vibrate(10)
  }, [])

  const resetScores = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, scores: prev.scores.map(() => 0) } : prev))
  }, [])

  const clear = useCallback(() => setSession(null), [])

  const winnerIndex = session
    ? session.scores.findIndex((s) => s >= session.winningScore)
    : -1

  return { session, start, adjustScore, resetScores, clear, winnerIndex }
}
