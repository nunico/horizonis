---
sessionId: session-260521-164907-le9i
---

# Requirements

### Overview & Goals

Execute repository verification (checks, linting, unit tests) and run the web end-to-end test suite.

### Scope

- In Scope:
  - Run `verify` across the Nx workspace, excluding desktop WDIO tests (`e2e-tests`).
  - Run Playwright-based web E2E tests configured in `apps/web-e2e`.
- Out of Scope:
  - Desktop E2E tests (`e2e:desktop`).
  - Code changes or test authoring.

### Acceptance Criteria

- `pnpm nx run-many --targets=check,lint,test --exclude=e2e-tests,web-e2e` completes with exit code 0.
- `pnpm run e2e:web` completes with exit code 0.
- Any generated reports/traces are noted for follow-up inspection.

# Technical Design

### Current Implementation

- Nx workspace scripts (package.json):
  - `verify`: `pnpm nx run-many --targets=check,lint,test`
  - `e2e:web`: `nx test web-e2e`
- Web app project: `apps/client/project.json`
  - Targets: `dev`, `build`, `preview`, `check` (runs `svelte-check`), `lint`, `test` (Vitest)
- Web E2E project: `apps/web-e2e/project.json`
  - `test` target runs `playwright test` in `apps/web-e2e`
- Playwright config: `apps/web-e2e/playwright.config.ts`
  - `webServer.command`: `pnpm nx preview horizonis-client`
  - `port`: 1420, `reuseExistingServer: true`, `env: { PUBLIC_E2E: '1' }`
  - `use.baseURL`: `http://localhost:1420`
  - Chromium project, headless, trace on first retry

### Key Decisions

- Use existing Nx scripts to ensure consistency with CI and caching.
- Rely on Playwright `webServer` to auto-start `horizonis-client` preview with `PUBLIC_E2E=1` for test instrumentation.
- Exclude `apps/e2e-tests` (WDIO desktop E2E) from workspace `verify` by invoking Nx with `--exclude=e2e-tests` to avoid unsupported `wry` browser in this environment.

### Proposed Steps

- Run `pnpm nx run-many --targets=check,lint,test --exclude=e2e-tests,web-e2e` to execute workspace checks, lint, and unit tests while skipping desktop WDIO and web E2E.
- Run `pnpm run e2e:web` to execute Playwright tests against the preview server.
- If a preview server is already running on 1420, Playwright will reuse it (`reuseExistingServer: true`).

### Files/Configs Referenced

- `package.json` scripts
- `apps/client/project.json`
- `apps/web-e2e/project.json`
- `apps/web-e2e/playwright.config.ts`

# Testing

### Validation Approach

- Observe command exit codes; success is exit code 0.
- Review console output for failing tasks/tests.
- For Playwright failures, inspect generated traces on first retry.

### Key Scenarios

- Verify task runs `check` (Svelte type/check), `lint` (ESLint + Prettier check), and `test` (Vitest) with no failures in `apps/client`.
- Web E2E suite starts the preview server and all tests under `apps/web-e2e/tests` pass on Chromium.

### Artifacts

- Playwright trace files generated on first retry (stored under the Playwright default results folder).
- Nx task logs in the console; any cached tasks reported by Nx.

# Delivery Steps

### ✓ Step 1: run-workspace-verify

`pnpm nx run-many --targets=check,lint,test --exclude=e2e-tests,web-e2e` finishes successfully, running checks, lint, and unit tests across projects (excluding desktop WDIO and web E2E).

- Execute `pnpm nx run-many --targets=check,lint,test --exclude=e2e-tests,web-e2e`.
- Targets involved (per project configs):
  - `apps/client`: `check` (`svelte-check`), `lint` (ESLint + Prettier check), `test` (Vitest run).
  - Any other projects with matching targets per Nx discovery (excluding the two E2E projects).

### ! Step 2: run-web-e2e-tests

`pnpm run e2e:web` completes with all Playwright tests passing.

- Execute `pnpm run e2e:web` (runs `nx test web-e2e`).
- Playwright auto-starts `horizonis-client` via `pnpm nx build horizonis-client && pnpm nx preview horizonis-client` on port 1420 with `PUBLIC_E2E=1`.
- Ensure port 1420 is available or let Playwright reuse an existing server.
- Confirm all tests in `apps/web-e2e/tests` pass on Chromium; inspect traces on failure.
