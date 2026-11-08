// Offline play: each build's service worker saves the whole app (page, code,
// font, icons) on install and serves it from there, network or not. A new
// deploy installs a new worker with its own copy, which takes over at once;
// the next launch gets the new game.
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE = `squid-${version}`;
// The page itself isn't in `prerendered`.
const FILES = ['/', ...[...immutable, ...assets, ...prerendered].map((f) => f.path)];

self.addEventListener('install', (event) =>
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(FILES);
			await self.skipWaiting();
		})()
	)
);

self.addEventListener('activate', (event) =>
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await self.clients.claim();
		})()
	)
);

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const hit = await cache.match(url.pathname === '/' ? '/' : event.request, {
				ignoreSearch: true
			});
			return hit ?? fetch(event.request);
		})()
	);
});
