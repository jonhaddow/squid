# Squid Spells

A canvas drawing game for Jon's kids (6 and 8): draw a shape to cast a spell and befriend sea creatures. See README.md.

## Worth knowing

- Unlike the other apps: no sign-in, no D1, no push. One prerendered page (`+layout.ts`) and a service worker that caches everything for offline play. Security headers are in `_headers` (root, not `static/`); the CSP is a `<meta>` from `vite.config.ts`.
- `src/lib/game/`: `gestures.ts` (shape recognition) and `progress.ts` (saves, levels, auto difficulty) are pure and unit tested; keep them that way. `game.ts` is the loop, `sprites.ts` draws everything with canvas paths (no image files), `audio.ts` synthesises every sound.
- Two modes, chosen after tapping a squid, both endless in waves of 10 friends (a hat each, a bit faster each, capped at wave 7): easy (square for jellyfish, auto difficulty, no losing, saves its wave in `level`) and hard (swirl, no auto difficulty, 3 hearts, game over, starts at wave 1 each game).
- Keep it for small kids: no reading needed, nothing scary, no losing in easy mode (hard mode's game over stays gentle), no ads, links or purchases.
- Updates: the service worker caches each build as `squid-<version>`; the page reloads into a newer cache when it's on the start screen, never mid-level, and checks again whenever the app comes back on screen (iPads resume rather than relaunch).
- `shot` is portrait-only, which shows the rotate prompt: use `node scripts/shot.ts` instead.
- The e2e tests read `window.__squid.state`.

## Review focus

Recognition being forgiving enough for a 6 year old, frame-rate on old tablets (no allocations in hot loops), touch on iOS Safari.
