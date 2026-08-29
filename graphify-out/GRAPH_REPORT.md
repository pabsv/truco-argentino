# Graph Report - Truco  (2026-08-29)

## Corpus Check
- 16 files · ~6,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 26 nodes · 26 edges · 3 communities
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e5b4dfa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- CLAUDE.md
- App

## God Nodes (most connected - your core abstractions)
1. `App()` - 3 edges
2. `loadEvents()` - 2 edges
3. `loadSnapshot()` - 2 edges
4. `What this app is` - 1 edges
5. `History note (2026-08-29 rollback)` - 1 edges
6. `Deployment` - 1 edges
7. `TeamKey` - 1 edges
8. `GameSnapshot` - 1 edges
9. `TAUNTS` - 1 edges
10. `EditableTeamNameProps` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (3 total, 0 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.11
Nodes (8): CONFETTI_COLORS, EditableTeamNameProps, GameSnapshot, InfoModalProps, ScorePanelProps, TAUNTS, TeamKey, WinCelebrationProps

### Community 1 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Deployment, History note (2026-08-29 rollback), What this app is

### Community 2 - "App"
Cohesion: 0.67
Nodes (3): App(), loadEvents(), loadSnapshot()

## Knowledge Gaps
- **11 isolated node(s):** `What this app is`, `History note (2026-08-29 rollback)`, `Deployment`, `TeamKey`, `GameSnapshot` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `loadEvents()` and `loadSnapshot()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `What this app is`, `History note (2026-08-29 rollback)`, `Deployment` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._