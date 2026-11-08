# Squid Spells

A canvas drawing game for Jon's kids (6 and 8): draw a shape to cast a spell and befriend sea creatures. See README.md.

## Worth knowing

- Unlike the other apps: no sign-in, no D1, no push. One prerendered page (`+layout.ts`) and a service worker that caches everything for offline play. Security headers are in `_headers` (root, not `static/`); the CSP is a `<meta>` from `vite.config.ts`.
- `src/lib/game/`: `gestures.ts` (shape recognition) and `progress.ts` (saves, levels, auto difficulty) are pure and unit tested; keep them that way. `game.ts` is the loop, `sprites.ts` draws everything with canvas paths (no image files), `audio.ts` synthesises every sound.
- Keep it for small kids: no reading needed, nothing scary, no losing, no ads, links or purchases.
- `shot` is portrait-only, which shows the rotate prompt: use `node scripts/shot.ts` instead.
- The e2e tests read `window.__squid.state`.

## Review focus

Recognition being forgiving enough for a 6 year old, frame-rate on old tablets (no allocations in hot loops), touch on iOS Safari.
