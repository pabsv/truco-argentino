## What this app is

Truco Argentino companion PWA: a matchbox scoreboard **plus** shared players and long-term stats. Vite 7 + React 19 + TS + Tailwind v4, `vite-plugin-pwa`. Spanish UI, green/yellow "card table" palette, hand-rolled SVG (no chart/UI libs beyond react-router).

## Backend (Supabase)

- **Dedicated project `eieaajvcdmldeacjksan`** ("TrucoApp", in the **Life OS** org). URL/publishable key in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). This is SEPARATE from the Life OS app's project (`qhvmpbkgzbnislbfjlue`) — do not confuse them. The old `truco_players`/`truco_games (jsonb)` tables in the Life OS project are legacy and unused by this app.
- **No auth (yet)** — anon-open RLS, one shared global pool. `players`/`games` carry a nullable `group_id` reserved for future groups; auth is a later decision.
- **Normalized schema** (migration `supabase/migrations/20260719000001_truco_stats.sql`): `players` (soft-archive via `archived_at`), `games` (mode `1v1|2v2|free-for-all`, `completed`, `winning_score`), `game_teams` (`is_winner`, `final_score`), `game_participants` (`game_id`,`player_id`,`team_index`). Games are written atomically via the `record_game(payload jsonb)` RPC (security invoker).
- **The MCP Supabase server in Claude Code is bound to the Life OS project, NOT this one** — it cannot query/migrate `eieaajvcdmldeacjksan`. Provision/inspect that project via the dashboard SQL editor or the CLI with an access token.

## Frontend architecture

- **Routing**: `react-router-dom` hash router (`src/router.tsx`); `App.tsx` = AppShell (Outlet + bottom `TabBar` + `useWakeLock`). Routes: `/` game, `/new` setup, `/stats`, `/stats/p/:id` player drill-down (deep-linkable), `/roster`.
- **Data**: `src/lib/{types,players,games,stats}.ts`. Stats strategy = **fetch-all-once → aggregate client-side** in pure functions (`stats.ts`: leaderboard, partnerships, head-to-head, form/streaks, trends). `useStatsData` fetches players+games; `useGameSession` holds the active game in localStorage.
- **Play flow**: `NewGameSetup` (pick mode + assign roster players) → `CasualGame` (matchbox `ScorePanel`/`MatchBoxes` per team) → on win, `RecordGameBar` calls `record_game`.
- `index.css` pins `#root { overflow:hidden; position:fixed }` — new scrollable pages use `PageShell` which opts back into internal scroll; the game screen stays full-bleed.

## Deployment note

Vercel project `truco` env vars still point at the OLD inaccessible project — update `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` to `eieaajvcdmldeacjksan`'s values and redeploy for production to work.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
