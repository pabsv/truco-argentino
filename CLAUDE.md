## What this app is

Truco Argentino matchbox scoreboard PWA: local score counter with celebration effects, no persistent stats. Vite 7 + React 19 + TS + Tailwind v4, `vite-plugin-pwa`. Spanish UI, green/yellow "card table" palette, hand-rolled SVG, no UI libs.

App logic lives in `src/App.tsx` (single screen, optional 3rd "Otros" mode, inline team renaming, wake lock via `src/hooks/useWakeLock.ts`). Extras kept from the July 2026 PRs: streak badges, the 67 ceremony, bowling-alley win celebration, end-of-game summary chart (`src/components/GameSummary.tsx`, fed by an in-game event log in localStorage), and snapshot restore after an accidental "Nueva Partida" tap. `index.css` pins `#root { overflow:hidden; position:fixed }` so the screen stays full-bleed.

## History note (2026-08-29 rollback)

Two separate stats efforts existed and both were removed at the user's request:

- Remote PRs #4/#5/#6 (July 2026) added StatsModal, TeamPicker player presets, and `src/lib/store.ts` syncing to the LEGACY `truco_games`/`truco_players` tables in the Life OS Supabase project (`qhvmpbkgzbnislbfjlue`). Cut out surgically; retrievable from git history before the rollback commit.
- A local-only, never-pushed Supabase branch (dedicated project `eieaajvcdmldeacjksan`, normalized schema, react-router tabs) is archived on branch `supabase-stats-archive`.

## Deployment

Vercel project `truco`, team `pablos-projects-38f708cc`. Deploys from GitHub master.
