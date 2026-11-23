// Streak bookkeeping shared by the live scoreboard and the end-of-game summary.
//
// Every team has its own run. A run survives while the team keeps scoring and
// only breaks once ALL of its rivals have scored since its last point. With
// two teams that is the classic rule (any rival point breaks it). With three,
// two teams usually score in parallel each hand, so both can be on a run at
// once: a run only dies when the team gets left out while the other two score.

export type Runs = Record<string, { count: number; rivals: string[] }>

// Registers a point for `team` (mutates `runs`). Returns the teams whose run
// was broken by this point.
export function addPoint(runs: Runs, team: string, active: string[]): string[] {
  const broken: string[] = []
  for (const other of active) {
    if (other === team) continue
    const run = runs[other]
    if (!run || run.count === 0) continue
    if (!run.rivals.includes(team)) run.rivals.push(team)
    if (run.rivals.length >= active.length - 1) {
      runs[other] = { count: 0, rivals: [] }
      broken.push(other)
    }
  }
  runs[team] = { count: (runs[team]?.count ?? 0) + 1, rivals: [] }
  return broken
}

// A correction (point taken back) ends that team's run
export function breakRun(runs: Runs, team: string) {
  delete runs[team]
}
