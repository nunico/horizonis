---
sessionId: session-260521-151524-16ru
---

# Requirements

### Overview & Goals

- Introduce Playwright-based web E2E tests to improve reliability and integrate with an MCP server for AI-assisted execution.
- Keep existing desktop (Tauri) E2E path intact via WebdriverIO for now; scope the Playwright migration to the web target only.
- Ensure Nx + pnpm task execution is the single source of truth; add or refine targets so `test`, `lint`, `check` (type-check) run thoroughly and consistently across apps.
- Provide parity of existing E2E coverage by porting current WDIO web scenarios.

### Scope

- In Scope
  - New Nx project for Playwright web E2E: `apps/web-e2e` with `playwright.config.ts`, tests under `apps/web-e2e/tests/`.
  - Port current WDIO web specs: `Map Rendering`, `Navigation Flow`, `App Responsiveness`.
  - Add Nx targets to run Playwright (`nx test web-e2e`) and eslint/prettier for the new project.
  - Refine root scripts to use Nx consistently (`e2e:web` → Playwright, keep `e2e:desktop` using WDIO).
  - Ensure TypeScript and Svelte checks are enforced via Nx (`horizonis-client:check` runs `svelte-check`). Add a workspace-level `check` script.
  - Wire Playwright’s built-in `webServer` runner to build/preview `apps/client` automatically with `PUBLIC_E2E=1`.
  - Configure Playwright MCP server so the agent can interact with tests during execution.
- Out of Scope
  - Migrating desktop E2E from WDIO to Playwright (can be a follow-up).
  - Broader CI pipeline changes (unless requested later).

# Technical Design

### Current Implementation

- Web app: `apps/client` (Vite/SvelteKit). Nx targets include `dev`, `build`, `preview`, `check` (runs `svelte-kit sync && svelte-check`), `lint`, and `test` (Vitest). See `apps/client/project.json`.
- E2E (combined web/desktop) today: `apps/e2e-tests` using WebdriverIO (`wdio.conf.js`) which:
  - For web: probes port `1420`, builds and starts `apps/client` via root scripts `build:web` and `preview:web` if needed.
  - For desktop: builds and drives Tauri using `tauri-driver` and launches the built app.
  - Nx target `e2e-tests:test` runs `wdio run wdio.conf.js`. Root scripts `e2e:web` and `e2e:desktop` set `TARGET` accordingly.
- Linting/formatting: Root `eslint.config.js` covers TS/Svelte and sets mocha/WDIO globals for `apps/e2e-tests/**/*.js`.
- TypeScript: Strict mode at `tsconfig.base.json`; `apps/client` enforces `svelte-check` via Nx `check` target.

### Key Decisions

1. Use Playwright Test for web E2E in a new Nx project `web-e2e` to avoid breaking desktop tests.
   - Rationale: clear separation of concerns; allows incremental migration and faster web-only iteration.
2. Start/stop the web server via Playwright `webServer` config rather than custom scripts in test code.
   - Rationale: simpler orchestration, fewer flake sources, native retries.
3. Reuse existing E2E readiness flags exposed by the web app (`window.e2eReady`, `window.e2eSystemReady`) for stable waits.
   - Rationale: already instrumented in `apps/client/src` (e.g., components set these flags), reduces DOM race conditions.
4. Add an Nx `check:all` workflow at the workspace level combining `nx run-many --targets=check,lint,test` to enforce TS/lint/classic tests before E2E.
   - Rationale: catches TypeScript and lint errors early; ensures consistent local and CI runs.
5. Enable Playwright MCP server so this agent can drive and introspect tests when needed.
   - Rationale: improves debuggability and observability for AI-assisted runs.

### Proposed Changes

- Create `apps/web-e2e/` with:
  - `playwright.config.ts`:
    - `testDir: 'apps/web-e2e/tests'`.
    - `webServer`: `{ command: 'pnpm nx preview horizonis-client', port: 1420, reuseExistingServer: true, env: { PUBLIC_E2E: '1' } }`.
    - Use Firefox or Chromium in headless mode for CI stability, retries=2, reporter `list`.
    - Configure MCP server (see below).
  - `tests` folder with `.spec.ts` files ported from WDIO:
    - `map-rendering.spec.ts`
    - `navigation-flow.spec.ts`
    - `responsiveness.spec.ts`
  - `project.json` for Nx:
    - `test` target: `nx:run-commands` with `command: 'playwright test'`, `cwd: 'apps/web-e2e'`.
    - `lint` target: `eslint .` in `apps/web-e2e`.
  - `tsconfig.json` to extend `../../tsconfig.base.json` with proper DOM libs.
- Scripts & Nx wiring:
  - Update root `package.json`:
    - `e2e:web`: `nx test web-e2e` (replace current WDIO-based web run).
    - Add `check` script: `nx run-many --targets=check`.
    - Add `verify` script: `pnpm nx run-many --targets=check,lint,test` to run TS checks, lint, and unit tests across the workspace before E2E.
  - Keep `e2e:desktop` and `e2e` scripts; `e2e` chains `e2e:web && e2e:desktop`.
- Playwright MCP Integration:
  - Add Playwright MCP server dependency (e.g., `@playwright/mcp` or current equivalent), enable it in `playwright.config.ts` via its provider hook so the agent can connect during runs.
  - Expose MCP server host/port via env vars for the agent.

### Data Models / Contracts

- No backend API changes. Tests consume app state via `page.evaluate` and `window.stores`, mirroring WDIO’s use of `browser.execute`.

### Components Affected

- New: `apps/web-e2e/*` (Playwright config + tests).
- Existing (read-only): `apps/client/src` readiness flags and test IDs already used by WDIO are reused.
- Existing scripts updated: root `package.json` `e2e:web`, new `check`/`verify` scripts.

### File Structure

- apps/
  - client/
  - e2e-tests/ (unchanged; remains for desktop)
  - web-e2e/ (new)
    - tests/
      - map-rendering.spec.ts
      - navigation-flow.spec.ts
      - responsiveness.spec.ts
    - playwright.config.ts
    - project.json
    - tsconfig.json

### Risks & Mitigations

- Flakiness from timing: Use readiness flags and Playwright’s auto-waits, plus retries.
- Port parity issues: Validate selectors and `window` access carefully; keep tests behavior-focused.
- MCP package API drift: Implement behind a small config shim so we can update easily if APIs change.
- CI time increase: Reuse existing server if detected; run browsers headless; run tests in a single project initially.

### Architecture Diagram

```mermaid
graph TD
  A[apps/web-e2e/playwright.config.ts] -->|webServer| B[pnpm nx preview horizonis-client]
  B --> C[apps/client (Vite/SvelteKit)]
  A --> D[Playwright Runner]
  D --> E[tests/*.spec.ts]
  E -->|page.evaluate| F[window.e2eReady / e2eSystemReady / stores]
  D --> G[MCP Server]
```

# Testing

### Validation Approach

- Run `pnpm run verify` to ensure TypeScript checks, lint, and unit tests pass across the workspace.
- Run `pnpm run e2e:web` to execute the new Playwright tests; confirm parity with WDIO results.
- Optionally run `pnpm run e2e:desktop` to ensure desktop path remains unaffected.

### Key Scenarios Mapped

- Map Rendering: page shows `[data-testid="star-map"]` with PixiJS canvas; debug hooks available; readiness observed.
- Navigation Flow: search and navigate to a system; breadcrumbs update; help overlay toggles; inspector edit/save flow.
- Responsiveness: cluster loads within bounds; transition to system view completes and signals `e2eSystemReady`.

### Edge Cases

- Server reuse: ensure `reuseExistingServer: true` works when a developer already has `nx preview horizonis-client` running.
- Timeouts: increase for slower CI nodes; ensure readiness waits guard against races.
- Missing globals: harden `page.evaluate` with try/catch when probing `window.stores` or helper functions.

# Delivery Steps

### ✓ Step 1: create-playwright-web-e2e-project

A new Nx project `apps/web-e2e` exists with Playwright configured to serve the web app automatically.

- Add `apps/web-e2e/project.json` with `test` (playwright), `lint` targets and `cwd: apps/web-e2e`.
- Add `apps/web-e2e/playwright.config.ts` with `webServer` pointing to `pnpm nx preview horizonis-client` on port 1420 and `env.PUBLIC_E2E=1`.
- Add `apps/web-e2e/tsconfig.json` extending the workspace base and enabling DOM libs.
- Add required devDependencies to the workspace for Playwright and its MCP server package.
- Ensure browsers are installed via `npx playwright install --with-deps` in tooling notes (CI can handle separately).

### ✓ Step 2: port-wdio-web-specs-to-playwright

All three existing WDIO web specs are ported to Playwright with equivalent behavior and stable waits.

- Create `tests/map-rendering.spec.ts`, `tests/navigation-flow.spec.ts`, and `tests/responsiveness.spec.ts` under `apps/web-e2e/tests/`.
- Replace WDIO APIs (`browser.*`, `$`, `$$`) with Playwright equivalents (`page.*`, `locator`) while keeping selectors.
- Use `await page.goto('http://localhost:1420')` only when server reuse is needed; otherwise rely on `webServer`’s baseURL.
- Access readiness flags and Svelte stores using `page.evaluate` with guarded access and timeouts.
- Validate tests locally; adjust timeouts and use Playwright auto-waits to reduce flakiness.

### ✓ Step 3: wire-nx-and-scripts-for-consistent-checks

Workspace scripts and Nx targets ensure TypeScript, lint, unit tests, and web E2E run consistently.

- Update root `package.json`:
  - `e2e:web` → `nx test web-e2e`.
  - Add `check`: `nx run-many --targets=check`.
  - Add `verify`: `pnpm nx run-many --targets=check,lint,test`.
- Keep `e2e:desktop` and `e2e` chaining unchanged except swapping web runner to Playwright.
- Confirm `apps/client/project.json` `check` still runs `svelte-kit sync && svelte-check`.
- Ensure root `eslint.config.js` covers `apps/web-e2e/**/*.ts` (inherits defaults). Add a project-level ESLint config override if needed for Playwright globals.
- Dry-run: `pnpm nx run-many --targets=check,lint,test` then `pnpm run e2e:web` to verify flow.

### ✓ Step 4: enable-mcp-and-document-usage

Playwright MCP server is enabled and documented for agent-driven test sessions.

- Add MCP dependency for Playwright and enable/configure it in `apps/web-e2e/playwright.config.ts`.
- Expose MCP bind address and port via environment variables for the agent.
- Provide a short README in `apps/web-e2e/` with run commands, environment variables, and troubleshooting for server reuse and MCP.
- Note follow-ups: consider migrating desktop E2E to Playwright in a later task and integrating with CI via Nx Cloud.
