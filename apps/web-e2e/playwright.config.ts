import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 60_000,
	retries: 2,
	reporter: [['html', { open: 'never' }], ['list']],
	expect: {
		timeout: 20_000
	},
	use: {
		baseURL: 'http://localhost:1420',
		headless: true,
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'npm exec -- nx build horizonis-client && npm exec -- nx preview horizonis-client',
		port: 1420,
		reuseExistingServer: true,
		timeout: 120_000,
		env: {
			PUBLIC_E2E: '1'
		}
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
