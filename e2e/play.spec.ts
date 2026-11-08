import { expect, test, type Page } from '@playwright/test';
import { guide, type Shape } from '../src/lib/game/gestures.ts';

test.use({ reducedMotion: 'reduce' });

/** Draws a shape with the mouse, in the middle of the screen. */
async function draw(page: Page, shape: Shape) {
	const size = 160;
	const points = guide(shape).map((p) => ({ x: 300 + p.x * size, y: 100 + p.y * size }));
	await page.mouse.move(points[0].x, points[0].y);
	await page.mouse.down();
	for (const p of points.slice(1)) await page.mouse.move(p.x, p.y);
	await page.mouse.up();
}

const state = (page: Page) => page.evaluate(() => window.__squid!.state);

test('the first creature waits to be taught, then a drawn zap makes it a friend', async ({
	page
}) => {
	await page.goto('/');
	await page.getByLabel('Play as squid 1').click();
	await page.getByRole('button', { name: 'Easy' }).click();
	await expect.poll(async () => (await state(page)).teaching, { timeout: 15_000 }).toBe('zigzag');

	await draw(page, 'circle'); // the wrong shape fizzles
	await page.waitForTimeout(600);
	expect((await state(page)).friends).toBe(0);

	await draw(page, 'zigzag');
	await expect.poll(async () => (await state(page)).friends).toBe(1);
	await expect(page.getByLabel('Home')).toBeVisible();

	// Progress is saved: back home, the star shows on the squid.
	await page.getByLabel('Home').click();
	await expect(page.getByLabel('1 stars')).toBeVisible();
});

test('easy mode teaches a square for the jellyfish, not a swirl', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await page.getByLabel('Play as squid 1').click();
	await page.getByRole('button', { name: 'Easy' }).click();
	await page.clock.runFor(8000);
	expect((await state(page)).teaching).toBe('zigzag');
	await draw(page, 'zigzag');
	await page.clock.runFor(10_000);
	expect((await state(page)).teaching).toBe('square');
	await draw(page, 'square');
	await page.clock.runFor(1000);
	expect((await state(page)).friends).toBe(2);
});

test('hard mode has 3 hearts and a game over, then a retry', async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem(
			'squid-spells-v1',
			JSON.stringify([{ learned: ['zigzag', 'swirl', 'circle', 'square'] }])
		)
	);
	await page.clock.install();
	await page.goto('/');
	await page.getByLabel('Play as squid 1').click();
	await page.getByRole('button', { name: 'Hard' }).click();
	expect((await state(page)).hearts).toBe(3);
	// Draw nothing and let the creatures bump the squid.
	await page.clock.runFor(90_000);
	expect(await state(page)).toMatchObject({ hearts: 0, over: true });
	await expect(page.getByText('Oh no!')).toBeVisible();
	await page.getByLabel('Try again').click();
	expect(await state(page)).toMatchObject({ hearts: 3, over: false });
});

test('hard mode keeps going and speeds up every 10 friends', async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem(
			'squid-spells-v1',
			JSON.stringify([{ learned: ['zigzag', 'swirl', 'circle', 'square'] }])
		)
	);
	await page.clock.install();
	await page.goto('/');
	await page.getByLabel('Play as squid 1').click();
	await page.getByRole('button', { name: 'Hard' }).click();
	const start = await state(page);
	expect(start.wave).toBe(1);
	while ((await state(page)).friends < 10) {
		await page.clock.runFor(500);
		const [next] = (await state(page)).creatures;
		if (next) await draw(page, next);
	}
	const now = await state(page);
	expect(now).toMatchObject({ wave: 2, over: false });
	expect(now.speed).toBeGreaterThan(start.speed);
});

test('asks to turn the phone sideways in portrait', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.getByRole('alert', { name: 'Turn your device sideways' })).toBeVisible();
	await page.setViewportSize({ width: 844, height: 390 });
	await expect(page.getByRole('alert')).toBeHidden();
});

test('the dressing room changes the colour and outfit, and remembers them', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Dress up').first().click();
	await page.getByLabel('Colour 4').click();
	await page.getByLabel('shades').click();
	await page.getByLabel('bowtie').click();
	// Hats have to be won first.
	await expect(page.getByLabel('Hat to win').first()).toBeDisabled();
	await page.getByLabel('Done').click();
	await page.reload();
	const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('squid-spells-v1')!)[0]);
	expect(saved).toMatchObject({ color: '#3d8bff', face: 'shades', neck: 'bowtie' });
});
