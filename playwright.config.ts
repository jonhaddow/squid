import { defineConfig, devices } from '@playwright/test';

// End-to-end tests play the real game in a landscape phone-sized Chromium.
// Port 5187: the other apps use 5180-5186, and sessions run them at once.
const PORT = 5187;

export default defineConfig({
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices['Pixel 7 landscape'],
		trace: 'retain-on-failure'
	},
	webServer: {
		command: `npx vite dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: !!process.env.E2E_REUSE,
		timeout: 120_000
	}
});
