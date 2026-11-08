# Squid Spells

A drawing-spells game for Jon's kids (6 and 8), at https://squid.app.haddow.me. You're a squid wizard under the sea. Grumpy crabs, jellyfish and pufferfish swim at you, each showing a shape. Draw it anywhere to cast the spell (zigzag: zap, swirl: bubbles, circle: shield) and they turn into friends.

- Landscape only (a rotate prompt shows in portrait), installable as a PWA, and it plays offline.
- No sign-in, no server, no data leaves the device: progress for the two squids is in localStorage.
- Built for small kids: almost no words, a finger shows each new shape, no losing, and it slows down when they miss.

```
npm run dev          # http://localhost:5173
npm test             # unit tests (shape recognition, progress)
npm run test:e2e     # plays the game in Chromium
node scripts/shot.ts /tmp/s.png --play   # landscape screenshot (dev server on 5187)
node scripts/icons.ts                    # redraws the app icons from the squid sprite
```
