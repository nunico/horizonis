Web E2E (Playwright)

- Prerequisites: pnpm install; npx playwright install --with-deps
- Run verify: pnpm run verify
- Run E2E: pnpm run e2e:web
- Config: apps/web-e2e/playwright.config.ts
- Tests: apps/web-e2e/tests/

MCP (standalone)

- Start: pnpx @playwright/mcp@latest --browser=chromium --headless --port 8931
- Point client to: http://127.0.0.1:8931
