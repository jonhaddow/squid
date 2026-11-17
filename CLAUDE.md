# Squid Spells (moved)

The game now lives in the games app, at https://games.app.haddow.me/squid (`~/code/games`, whose CLAUDE.md covers it). This repo only hands devices over.

- One prerendered page: on load it sends the device to the games app with its `squid-*` localStorage in the link (`src/lib/handoff.ts`), which the games app takes in, along with the device's old board scores.
- The service worker stays as it was: old home-screen installs only reload into a newer version that their worker has cached, so removing it would strand them on the old game.
- No D1 any more: the board was copied into games (`scripts/squid-import.ts` there). The `squid` database can be deleted once games has it.
- Once nobody opens the old app, the Worker and this repo can go.
