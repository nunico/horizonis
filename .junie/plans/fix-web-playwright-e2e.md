---
sessionId: session-260521-175410-pg8l
---

# Requirements

### Overview & Goals

Stabilize and fix Playwright E2E tests under `apps/web-e2e` so they pass reliably in local and CI runs. Ensure the app exposes explicit readiness hooks to avoid flaky timing and selectors are resilient.

### Scope

- In Scope:
  - Update Playwright config in `apps/web-e2e/playwright.config.ts` for reliable server startup, retries, and trace collection.
  - Harden E2E readiness and debug hooks already present in the Svelte app so tests can deterministically wait for ready states.
  - Review and fix tests in `apps/web-e2e/tests/*.spec.ts` to use robust waits and selectors.
  - Ensure Nx targets run E2E via `pnpm nx test web-e2e` and integrate with CI.
- Out of Scope:
  - Non-E2E feature work on the app.
  - Replacing Playwright with another framework.

### User Stories

- As a maintainer, I want deterministic E2E tests so that regressions are caught without flakes.
- As a contributor, I want a single command to run E2E locally and in CI.

### Functional Requirements

- `pnpm nx test web-e2e` starts the preview server, runs tests, and exits zero on success.
- Tests must only interact with the app after `window.e2eReady` and page-specific readiness (`e2eClusterReady` / `e2eSystemReady`) are true and loading screen is gone.
- Selectors use `data-testid` or stable text/roles; no brittle deep DOM queries.
- Playwright traces on failure are produced and saved in `apps/web-e2e/playwright-report` or default location.

# Technical Design

### Current Implementation

- Playwright project: `apps/web-e2e`
  - Config: `apps/web-e2e/playwright.config.ts` with `webServer` running `pnpm nx build horizonis-client && pnpm nx preview horizonis-client` on port `1420`, and `env.PUBLIC_E2E='1'`.
  - Tests: `tests/map-rendering.spec.ts`, `tests/navigation-flow.spec.ts`, `tests/responsiveness.spec.ts`.
- App under test: `apps/client (horizonis-client)` built with SvelteKit/Vite.
  - App readiness flag: `apps/client/src/routes/+page.svelte` sets `window.e2eReady = true` after `initWasm()` and `loadCluster()`.
  - Cluster/system readiness flags and debug hooks:
    - `StarMap.svelte`: toggles `window.e2eClusterReady` false→true around render and exposes `starMapDebug` viewport.
    - `SolarSystemMap.svelte`: toggles `window.e2eSystemReady` false→true and exposes `solarSystemMapDebug` viewport.
  - Global `window.stores` and `window.getClusterSnapshot()` exposed in `apps/client/src/routes/+layout.svelte` for E2E.

### Key Decisions

- Keep Playwright and Nx runner; improve reliability via explicit waits on `e2eReady`, `e2eClusterReady`, `e2eSystemReady`, and `loading-screen` disappearance.
- Prefer `locator([...]).toBeVisible()` with generous, test-specific timeouts and `page.waitForFunction` using window flags over arbitrary sleeps.
- Keep `webServer` orchestration in Playwright config; add `stdout: 'pipe'`/`stderr: 'pipe'` and longer `timeout` to avoid startup races.
- Use single Chromium project initially; parallelism can remain default.

### Proposed Changes

- `apps/web-e2e/playwright.config.ts`
  - Increase `webServer.timeout` (e.g., 120_000) to accommodate build + preview.
  - Set `reporter: [['html', { open: 'never' }], ['list']]` for CI artifacts while keeping console output; retain `trace: 'on-first-retry'`.
  - Optionally add `expect: { timeout: 20000 }` for consistent expectation timeouts.
- Tests adjustments
  - `tests/responsiveness.spec.ts`: ensure navigation awaits `page.goto('/')` readiness, then `waitForFunction(() => window.e2eReady === true)` and wait for `[data-testid="loading-screen"]` to be detached rather than merely visible before asserting star-map. Use `page.waitForFunction(() => window.e2eClusterReady === true)` before measuring performance-sensitive assertions.
  - `tests/map-rendering.spec.ts`: already waits for flags; ensure the `canvas` count assertions follow readiness; verify `starMapDebug`/`solarSystemMapDebug` checks happen after their respective flags turn true.
  - `tests/navigation-flow.spec.ts`: replace nav breadcrumbs free-text read with more stable role/label checks if available; otherwise guard with `e2eSystemReady`. Ensure the back button selector `button[aria-label="Go back"]` is present and visible before click.
- Nx project wiring
  - Keep `apps/web-e2e/project.json` `test` target as `playwright test` with `cwd`. Ensure `pnpm nx test web-e2e` works in CI where preview port 1420 is free.

### Data/Contracts

- Readiness flags (window globals):
  - `e2eReady: boolean` (app initialized)
  - `e2eClusterReady: boolean` (cluster view rendered)
  - `e2eSystemReady: boolean` (system view rendered)
- Stable test selectors: `data-testid="loading-screen"`, `data-testid="star-map"`, `data-testid="solar-system-map"`.

### Components Affected

- E2E tests: `apps/web-e2e/tests/*.spec.ts`
- Playwright config: `apps/web-e2e/playwright.config.ts`
- App hooks (read-only validation): `+page.svelte`, `StarMap.svelte`, `SolarSystemMap.svelte`, `+layout.svelte`.

### Risks & Mitigations

- Build timeouts causing server not detected → raise `webServer.timeout`, `reuseExistingServer: true` retained.
- Flaky waits due to microtasks → always wait for `e2e*Ready === true` and element visibility after flags.
- Selector brittleness → prefer `data-testid` and roles; avoid text-only where labels may change.

# Testing

### Validation Approach

- Local: run `pnpm nx test web-e2e` and confirm all specs pass, with traces only on retries.
- CI: ensure Nx target is used; confirm artifacts (trace, report) are generated on failure.

### Key Scenarios

- App init: waits for `e2eReady` and loading screen detaches before assertions.
- Cluster render: `star-map` visible, one canvas, `e2eClusterReady` true, child count > 0.
- System render: selecting first system via stores transitions view, `solar-system-map` visible, `e2eSystemReady` true, body count > 0, header visible.
- Navigation flow: search, select system, back to cluster via back button, help overlay toggles.

### Edge Cases

- Slow WASM init or large cluster: timeout increases allow completion without false negatives.
- Server reuse: if an instance is already running, tests still connect due to `reuseExistingServer: true`.

# Delivery Steps

### ✓ Step 1: Harden Playwright server orchestration and timeouts

Playwright starts and reliably detects the preview server with sufficient timeouts and useful reporting.

- Update `apps/web-e2e/playwright.config.ts`:
  - Increase `webServer.timeout` (e.g., to 120_000) and keep `reuseExistingServer: true`.
  - Add `expect: { timeout: 20000 }` default.
  - Switch `reporter` to a tuple including `html` plus `list` for CI artifacts while retaining console output.
  - Keep `trace: 'on-first-retry'` and confirm baseURL 1420.
- Verify `pnpm nx preview horizonis-client` serves at 1420 and respects `PUBLIC_E2E=1`.

### ✓ Step 2: Stabilize tests with explicit readiness waits and resilient selectors

Each spec waits for `e2eReady` and the relevant `e2e*Ready` flag and uses stable selectors before interacting or asserting.

- `tests/responsiveness.spec.ts`: wait for `e2eReady`, then for `[data-testid="loading-screen"]` to detach; ensure `e2eClusterReady` before measuring transitions; use `toBeVisible({ timeout: 20000 })` where needed.
- `tests/map-rendering.spec.ts`: ensure `canvas` checks run after `e2eClusterReady`/`e2eSystemReady`; keep viewport debug checks after flags.
- `tests/navigation-flow.spec.ts`: guard search and navigation with readiness flags; ensure `button[aria-label="Go back"]` is present and visible before clicking; prefer role/name locators for breadcrumbs or assert via store snapshot if needed.

### \* Step 3: Nx wiring and CI readiness

Running E2E via Nx works locally and is CI-friendly.

- Confirm `apps/web-e2e/project.json` `test` target works with `pnpm nx test web-e2e`.
- Ensure no port conflicts on 1420 in CI; document fallback if needed.
- Keep reports/traces in default Playwright output; ensure CI collects artifacts.
