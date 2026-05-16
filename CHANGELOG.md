# Changelog

All notable changes to the Horizonis project by AI agents will be documented in this file.

### [2026-05-16] - Agent Guidelines & Documentation
- **Summary**: Added project governance documents for AI agents.
- **Changes**:
  - Created `AGENTS.md` with guidelines for token efficiency and memory management.
  - Initialized `CHANGELOG.md` with historical context.
- **Files Affected**: `AGENTS.md`, `CHANGELOG.md`

### [2026-05-16] - Responsiveness Optimization & E2E Testing
- **Summary**: Resolved UI freezing and added WebDriver tests.
- **Changes**:
  - Implemented in-memory caching in Rust using `tauri::State`.
  - Optimized frontend data fetching to use Svelte stores.
  - Added WebdriverIO + `tauri-driver` testing suite in `e2e-tests/`.
  - Instrumented components with `data-testid` and exposed stores for testing.
- **Files Affected**: `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`, `src/lib/components/SolarSystemMap.svelte`, `e2e-tests/`

### [2026-05-16] - Astro-Physical Cluster Generation (Rust)
- **Summary**: Reimplemented cluster generation in Rust with realistic physics.
- **Changes**:
  - Added `src-tauri/src/generation.rs` using `rand` and `delaunator`.
  - Implemented planar graph (non-crossing) portal network.
  - Added physical properties (mass, radius) to stars and planets.
  - Enhanced Inspector UI to display gravity and physical units.
- **Files Affected**: `src-tauri/src/generation.rs`, `src-tauri/src/models.rs`, `src/lib/types/stellar.ts`, `src/lib/components/Inspector.svelte`

### [2026-05-15] - Procedural Data Generation (TypeScript)
- **Summary**: Initial data generation script for 15 solar systems.
- **Changes**:
  - Created `scripts/generate_cluster.ts`.
  - Embedded generated data into backend via `include_str!`.
- **Files Affected**: `scripts/generate_cluster.ts`, `src-tauri/src/storage.rs`

### [2026-05-15] - Testing Infrastructure
- **Summary**: Added Vitest and Cargo tests.
- **Changes**:
  - Configured Vitest for frontend unit and component tests.
  - Added Rust unit tests for storage and route-finding.
- **Files Affected**: `vitest.config.ts`, `src/test/`, `src-tauri/src/commands.rs`, `src-tauri/src/storage.rs`

### [2026-05-15] - Linting & Formatting
- **Summary**: Added ESLint and Prettier.
- **Changes**:
  - Configured ESLint with Svelte 5 and TypeScript support.
  - Added Prettier for consistent styling.
- **Files Affected**: `eslint.config.js`, `.prettierrc`, `package.json`

### [2026-05-15] - Initial Project Implementation
- **Summary**: Built core features according to the design plan.
- **Changes**:
  - Scaffolded Tauri v2 + SvelteKit app.
  - Implemented Pixi.js renderer for Cluster and Solar System views.
  - Created Rust backend with JSON persistence.
- **Files Affected**: Entire repository scaffolding.
