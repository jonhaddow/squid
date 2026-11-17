import { expect, test } from '@playwright/test';

test('sends the device on to the games app, with its save', async ({ page }) => {
	await page.route('https://games.app.haddow.me/**', (route) =>
		route.fulfill({ body: 'new home' })
	);
	await page.addInitScript(() => {
		if (location.hostname === 'localhost') localStorage.setItem('squid-device', 'abc');
	});
	await page.goto('/');
	await expect(page).toHaveURL(/^https:\/\/games\.app\.haddow\.me\/squid#import=[\w-]+$/);
});
