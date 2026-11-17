// Draws the app icons from the game's own squid (sprites.ts) in headless
// Chromium. Run after changing the squid: node scripts/icons.ts
import { buildSync } from 'esbuild';
import { chromium } from 'playwright';

const art = buildSync({
	entryPoints: ['src/lib/game/sprites.ts'],
	bundle: true,
	format: 'iife',
	globalName: 'art',
	write: false
}).outputFiles[0].text;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<canvas id="c"></canvas><script>${art}</script>`);
for (const [file, size, pad] of [
	['icon-512.png', 512, 1],
	['icon-maskable.png', 512, 0.78],
	['icon-192.png', 192, 1],
	['apple-touch-icon.png', 180, 1],
	['favicon-32.png', 32, 1]
] as const) {
	const png = await page.evaluate(
		([size, pad]) => {
			const canvas = document.getElementById('c') as HTMLCanvasElement;
			canvas.width = canvas.height = size;
			const ctx = canvas.getContext('2d')!;
			const sea = ctx.createLinearGradient(0, 0, 0, size);
			sea.addColorStop(0, '#1466a8');
			sea.addColorStop(1, '#071a3d');
			ctx.fillStyle = sea;
			ctx.fillRect(0, 0, size, size);
			ctx.translate(size * 0.47, size * 0.64);
			// @ts-expect-error: the bundle's global
			art.drawSquid(
				ctx,
				size * 0.56 * pad,
				{ color: '#b45cff', hat: 'wizard', neck: null, face: null },
				0.4
			);
			return canvas.toDataURL('image/png').split(',')[1];
		},
		[size, pad] as const
	);
	await import('node:fs').then((fs) =>
		fs.writeFileSync(`static/${file}`, Buffer.from(png, 'base64'))
	);
}
await browser.close();
