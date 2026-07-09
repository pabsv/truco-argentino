---
name: verify
description: Build, launch, and drive the Truco PWA to verify changes end-to-end without touching the live Supabase DB.
---

# Verifying truco-argentino

React + Vite PWA, single screen with overlays. No test runner; verification is driving the app in a browser.

## Build / launch

```bash
npm run build        # tsc -b && vite build — the type-check gate
npm run lint
npm run dev -- --port 5173 --strictPort   # serves at / (no base path in dev)
```

## Drive (Playwright, pre-installed Chromium)

Use the globally installed Playwright: `require('/opt/node22/lib/node_modules/playwright')`, headless Chromium, viewport ~390x844 (phone portrait).

**Always block Supabase first** so no test data leaks into the live shared DB (`truco_games` / `truco_players` — real friends' data, one shared pool):

```js
await context.route('**supabase.co/**', route => route.abort())
```

Blocked requests can still be inspected (`route.request().url()/postData()`) to assert what the app *would* send.

## Seeding stats data

`goto('http://localhost:5173/')`, then `page.evaluate` to set localStorage, then `reload()`:
- `truco-games`: array of `StoredGame` (`src/lib/store.ts`). Seed with `synced: true` so `syncGames()` never POSTs them.
- `truco-players`: `string[]` of preset names.

## Flows worth driving

- 📊 button (`aria-label="Estadísticas"`) → StatsScreen: ranked players, tap a row → head-to-head panel, `Historial de partidas` toggle, `Mostrar más` pagination (needs >10 games).
- Score a game: click the `+` button 30× → win celebration → `corregir puntaje` dismisses it.
- `?` button → InfoModal.

## Gotchas

- Player-row buttons: `div.space-y-1\\.5 > div > button` (innerText gives `"👑 Pablo 4 3 75% ▾"`).
- "Add to Home Screen" text appears 3× in InfoModal — use `getByRole('heading', ...)`.
- Stat expectations for a known fixture set live in the plan/verification table; win attribution derives from score ≥ 30 (`src/lib/stats.ts` `winnerIndex`), not the stored winner name.
