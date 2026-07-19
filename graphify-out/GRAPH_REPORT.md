# Graph Report - Truco  (2026-07-19)

## Corpus Check
- 46 files · ~12,016 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 261 nodes · 458 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dd1a6153`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- PartnershipsPanel.tsx
- Community 11
- Community 12
- Community 13
- Community 23

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `Player` - 14 edges
4. `computeTrends()` - 12 edges
5. `applyFilters()` - 11 edges
6. `PlayerDetailPage()` - 10 edges
7. `useStatsData()` - 9 edges
8. `GameMode` - 9 edges
9. `StatsPage()` - 9 edges
10. `computePartnerships()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `NewGameSetup()` --indirect_call--> `nameOf()`  [INFERRED]
  src/screens/NewGameSetup.tsx → src/lib/stats.ts
- `PlayerAssignProps` --references--> `Player`  [EXTRACTED]
  src/components/game/PlayerAssign.tsx → src/lib/types.ts
- `PlayerListItemProps` --references--> `Player`  [EXTRACTED]
  src/components/roster/PlayerListItem.tsx → src/lib/types.ts
- `NewGameSetup()` --calls--> `useGameSession()`  [EXTRACTED]
  src/screens/NewGameSetup.tsx → src/hooks/useGameSession.ts
- `useStatsData()` --calls--> `fetchGamesForStats()`  [EXTRACTED]
  src/hooks/useStatsData.ts → src/lib/games.ts

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (22): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, src, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, name, private, scripts (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (34): FormPanel(), HeadToHeadPanel(), HeadToHeadPanelProps, StatCard(), StatCardProps, COLORS, TrendChart(), TrendChartProps (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (20): RecordGameBar(), RecordGameBarProps, InfoModal(), InfoModalProps, MatchBoxes(), ScorePanel(), ScorePanelProps, GameSession (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (22): PlayerAssign(), PlayerAssignProps, PlayerListItem(), PlayerListItemProps, activePreset(), daysAgoIso(), FilterBar(), FilterBarProps (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (5): COLS, Leaderboard(), LeaderboardProps, SortKey, LeaderboardRow

### Community 10 - "PartnershipsPanel.tsx"
Cohesion: 0.50
Nodes (3): PartnershipsPanel(), PartnershipsPanelProps, PartnershipRow

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): Backend (Supabase), Deployment note, Frontend architecture, graphify, What this app is

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (19): App(), PageShell(), PageShellProps, TabBar(), tabs, AddPlayerInput(), AddPlayerInputProps, addPlayer() (+11 more)

## Knowledge Gaps
- **94 isolated node(s):** `What this app is`, `Backend (Supabase)`, `Frontend architecture`, `Deployment note`, `graphify` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 6` to `Community 3`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `Player` connect `Community 7` to `Community 4`, `Community 23`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `What this app is`, `Backend (Supabase)`, `Frontend architecture` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1289198606271777 - nodes in this community are weakly interconnected._