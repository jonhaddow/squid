# How the game works

You're a squid wizard under the sea. Grumpy crabs, jellyfish, pufferfish and angelfish swim at you, each showing a shape. Draw it anywhere to cast the spell (zigzag: zap, circle: shield, triangle: fins, swirl: bubbles for the jellyfish) and they turn into friends.

Every 3rd wave (3, 6, 9...) ends with the kraken: the other creatures swim off, and it needs 3 spells, a random shape each, to become a friend.

Each device has one squid, with a dressing room (the T-shirt button): a name, a colour, a hat, something round its neck and glasses. Every 10 friends unlocks the next prize (all the hats first, then new hats, necks and glasses mixed in).

Both modes (Chill and Challenge on screen, easy and hard in code) are endless. Easy mode has no losing, stays at the same pace and remembers how far you got. Hard mode is faster, speeds up every 10 friends with no limit (and gets busier, up to a point), has 3 hearts and a game over, and starts again each game.

- Install: open it in Safari (or Chrome), then Share → Add to Home Screen. The glowing phone button on the start screen shows the steps (or installs it straight away in Chrome on Android).
- Landscape only (a rotate prompt shows in portrait), installable as a PWA, and it plays offline.
- No sign-in. Progress is in localStorage; only the squid's name, colour, best hard-mode game and total friends go to the server, for the leaderboards on the start screen.
- Built for young children: almost no words, a finger shows each new shape, no losing in easy mode, and it slows down when they miss.
