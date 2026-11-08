// Landscape phone screenshot of the local app: the start screen, or with
// --play, the game a few seconds in. Usage: node scripts/shot.ts [out.png] [--play] [--port 5187]
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const out = args.find((a) => a.endsWith('.png')) ?? '/tmp/squid.png';
const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : '5187';
const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width: 844, height: 390 },
	deviceScaleFactor: 2,
	reducedMotion: 'reduce'
});
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForTimeout(1000);
if (args.includes('--play')) {
	await page.getByLabel('Play as the purple squid').click();
	await page.waitForTimeout(8000);
}
await page.screenshot({ path: out });
await browser.close();
console.log(out);
