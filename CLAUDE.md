# Squid Spells

A canvas drawing game for Jon's kids (6 and 8): draw a shape to cast a spell and befriend sea creatures. See README.md.

## Worth knowing

- Unlike the other apps: no sign-in, no push. One prerendered page (`+layout.ts`) and a service worker that caches everything for offline play. The only server code is `POST /api/scores` (the leaderboard, D1 `scores` table, raw SQL in `migrations/`, no Drizzle): each device posts its squid (a random id from `squid-device` in localStorage, plus its look, checked against `HATS`/`NECKS`/`FACES` in `parseEntry`) and gets the top 20 back (the board scrolls), each drawn with `SquidPreview`. Offline, the board just doesn't show. Security headers are in `_headers` (root, not `static/`); the CSP is a `<meta>` from `vite.config.ts`.
- `src/lib/game/`: `gestures.ts` (shape recognition) and `progress.ts` (saves, levels, wave pacing) are pure and unit tested; keep them that way. `game.ts` is the loop, `sprites.ts` draws everything with canvas paths (no image files), `audio.ts` synthesises every sound.
- One squid per device (saves are still a one-item list, from when there were two). The leaderboard score is `best`: most friends in one hard-mode game.
- Two modes, chosen after tapping the squid (labelled Chill and Challenge; `easy` and `hard` in code), both endless in waves of 10 friends (a prize unlocked each, in `PRIZES` order): easy (the same pace every wave, no losing, saves its wave in `level`) and hard (faster every wave with no limit and busier up to wave 7, 3 hearts, game over, starts at wave 1 each game). Both use the same shapes (`SHAPES` in `gestures.ts`); a square counts as a circle.
- Every 3rd wave ends with the kraken (`fighting` in `game.ts`): after the 10th friend, the rest swim off (`leave`), no new ones come, and it takes 3 random shapes (`bossShapes`) before the prize.
- The dressing room (T-shirt button on each squid) sets `name`, `color` (from `PALETTE`), `hat`, `neck` and `face`. Items in `PRIZES` must be won first (`won`; winning one doesn't change what's worn); the first four necks and glasses are free. `drawSquid` takes the player as its look.
- Keep it for small kids: no reading needed, nothing scary, no losing in easy mode (hard mode's game over stays gentle), no ads, links or purchases.
- Updates: the service worker caches each build as `squid-<version>`; the page reloads into a newer cache when it's on the start screen, never mid-level, and checks again whenever the app comes back on screen (iPads resume rather than relaunch).
- The start screen's corner button (`InstallHint.svelte`, platform from `src/lib/install.ts`) shows how to add the game to the home screen; hidden once installed and on computers. Chromium emulation reports 1 touch point, so iPad tests fake `maxTouchPoints`.
- `shot` is portrait-only, which shows the rotate prompt: use `node scripts/shot.ts` instead.
- The e2e tests read `window.__squid.state`.

## Review focus

Recognition being forgiving enough for a 6 year old, frame-rate on old tablets (no allocations in hot loops), touch on iOS Safari.
