import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'apps/web-e2e/tests',
  timeout: 60_000,
  retries: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'pnpm nx preview horizonis-client',
    port: 1420,
    reuseExistingServer: true,
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
