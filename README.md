# Squid Spells (moved)

A drawing game for younger kids, now part of the family games app at [games.app.haddow.me/squid](https://games.app.haddow.me/squid).

This site just sends devices there, bringing their saved progress along.

## Tech stack

- [SvelteKit](https://svelte.dev) and TypeScript: one prerendered page and a service worker
- [Cloudflare Workers](https://workers.cloudflare.com), deployed from `main` by Workers Builds

## Running locally

```sh
npm ci
npm run dev
```

Tests: `npm test` (unit), `npm run test:e2e` (Playwright), `npm run check` (types), `npm run lint`.
