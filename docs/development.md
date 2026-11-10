# Development

```sh
npm ci
npm run dev          # http://localhost:5173
npm test             # unit tests (shape recognition, progress)
npm run test:e2e     # plays the game in Chromium
node scripts/shot.ts /tmp/s.png --play   # landscape screenshot (dev server on 5187)
node scripts/icons.ts                    # redraws the app icons from the squid sprite
```

Pushing to `main` deploys through Cloudflare Workers Builds.
