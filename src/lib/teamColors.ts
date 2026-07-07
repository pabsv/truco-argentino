// Shared team palette, in panel order: nosotros, ellos, otros. The scoreboard
// streak badge and the summary chart/stats all pull from here so a team keeps
// the same colour everywhere.
export const TEAM_COLORS = ['#fbbf24', '#7dd3fc', '#fb923c']

export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}
