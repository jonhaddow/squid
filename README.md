# Squid Spells

A drawing-spells game for Jon's kids (6 and 8), at https://squid.app.haddow.me. You're a squid wizard under the sea. Grumpy crabs, jellyfish and pufferfish swim at you, each showing a shape. Draw it anywhere to cast the spell (zigzag: zap, circle: shield, and for the jellyfish a square in easy mode or a swirl in hard) and they turn into friends.

Each kid's squid has a dressing room (the T-shirt button): a colour, a hat (one won every 10 friends), something round its neck and glasses.

Both modes are endless: every 10 friends wins a hat, and the creatures get a little faster (up to a limit). Easy mode has no losing, slows down when they miss and remembers how far they got. Hard mode is faster, has 3 hearts and a game over, and starts slow again each game.

- Install: open it in Safari (or Chrome), then Share → Add to Home Screen.
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
