# Squid Spells

A drawing game for younger kids. You're a squid wizard under the sea: sea creatures swim at you, each showing a shape, and drawing that shape casts a spell that turns them into friends. Friends unlock hats and outfits for your squid.

It's designed for small children: almost no reading, nothing scary, a gentle mode with no losing, and it plays offline once installed. How it plays: [`docs/game.md`](docs/game.md).

## Tech stack

- [SvelteKit](https://svelte.dev) (Svelte 5) and TypeScript, as an offline-first PWA with a service worker
- HTML canvas for all the graphics, and the Web Audio API for sound (no image or sound files)
- [Cloudflare Workers](https://workers.cloudflare.com), with [D1](https://developers.cloudflare.com/d1/) for the leaderboard
- [Vitest](https://vitest.dev) and [Playwright](https://playwright.dev) for tests
- Deployed from `main` by Cloudflare Workers Builds

## Development

See [`docs/development.md`](docs/development.md).
