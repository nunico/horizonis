# Changelog

All notable changes to the Horizonis project by AI agents will be documented in this file.

###### [2026-05-18] - Move E2E tests to apps/e2e-tests

- **Summary**: Relocated e2e-tests to the apps directory and configured Nx integration.
- **Changes**:
  - Moved `e2e-tests/` to `apps/e2e-tests/`.
  - Created `apps/e2e-tests/project.json` with test and lint targets.
  - Updated `apps/e2e-tests/wdio.conf.js` with correct application and workspace paths.
  - Updated `eslint.config.js` to match the new e2e-tests location.
  - Added "e2e" script to root `package.json`.
  - Removed redundant `pnpm-lock.yaml` and `node_modules` from `apps/e2e-tests`.
- **Files Affected**: `apps/e2e-tests/`, `package.json`, `eslint.config.js`, `apps/e2e-tests/project.json`, `apps/e2e-tests/wdio.conf.js`.
- **Context**: None.

###### [2026-05-18] - Monorepo Restructure

- **Summary**: Restructured the project into an Nx monorepo with separate `apps/web` (SvelteKit) and `apps/desktop` (Tauri) packages.
- **Changes**:
  - Initialized Nx and configured pnpm workspaces for improved task orchestration and dependency management.
  - Moved SvelteKit frontend to `apps/web` and Tauri backend to `apps/desktop`.
  - Updated configuration files (`tauri.conf.json`, `tsconfig.json`, `vite.config.js`, `svelte.config.js`) for the new structure.
  - Created root orchestration scripts in `package.json` for unified dev and build workflows.
  - Set up `tsconfig.base.json` at the root for shared TypeScript configuration.
  - Configured ESLint and Prettier for monorepo support and cleaned up the legacy `src-tauri` directory.
- **Files Affected**: `apps/web/`, `apps/desktop/`, `package.json`, `nx.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`.
- **Context**: None.

###### [2026-05-18] - Create generate-changelog skill

- **Summary**: Created a new Junie skill for generating changelog entries consistent with project guidelines.
- **Changes**:
  - Created `.junie/skills/generate-changelog/SKILL.md` containing documentation for the changelog workflow.
  - Defined the trigger, workflow, and expected format for agent-led changelog updates.
- **Files Affected**: `.junie/skills/generate-changelog/SKILL.md`
- **Context**: This skill ensures that all future agents follow the standardized changelog format defined in AGENTS.md.

###### [2026-05-16] - Migrate to pnpm

- **Summary**: Replaced Deno, npm, and yarn with pnpm as the project's primary package manager and updated all configuration files.
- **Changes**:
  - Replaced Deno and npm with pnpm across the project and e2e-tests.
  - Updated `mise.toml` to use pnpm and removed Deno dependency.
  - Updated `tauri.conf.json` with pnpm-specific dev and build commands.
  - Added `@types/node` to root devDependencies for better TypeScript support.
  - Cleaned up `deno.lock` and `yarn.lock` files from the repository.
  - Verified the migration by running tests and linting via pnpm.
- **Files Affected**: `package.json`, `e2e-tests/package.json`, `mise.toml`, `src-tauri/tauri.conf.json`, `e2e-tests/wdio.conf.js`, `README.md`
- **Context**: Standardizing on pnpm improves performance and consistency across different environments.

### [2026-05-16] - Update E2E test runner command

- **Summary**: Updated E2E test script to use npm instead of Deno.
- **Changes**:
  - Updated E2E test script to use npm instead of Deno.
- **Files Affected**: `package.json`, `e2e-tests/package.json`
- **Context**: Aligns E2E execution with the Node/WebdriverIO setup.

### [2026-05-16] - Fix map centering and viewport UX

- **Summary**: Implemented a robust viewport centering and clamping strategy that accounts for the navigation bar and allows panning on small windows.
- **Changes**:
  - Replaced `underflow: 'center'` with manual clamping logic that dynamically locks the center when content fits, but allows panning when it doesn't.
  - Added a 56px vertical offset to map centering to account for the Navigation bar height.
  - Adjusted `minScale` calculations to ensure full visibility within the visible area (excluding the navigation bar).
  - Re-added large `worldWidth` and `worldHeight` to the Viewport constructor to ensure correct coordinate handling and panning range.
  - Updated E2E regression tests to reflect the new centering behavior.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`, `e2e-tests/test/specs/zoom-ux.e2e.js`
- **Context**: Previous fix was too restrictive and broke centering for solar systems; this version is more flexible and handles UI overlap.

### [2026-05-16] - Resolve viewport centering conflict

- **Summary**: Fixed a conflict between `viewport.clamp` and the manual viewport centering that caused clusters to appear off-center.
- **Changes**:
  - Removed `direction: 'all'` from `viewport.clamp` in `StarMap.svelte` and `SolarSystemMap.svelte` to prevent overriding explicit bounds.
  - Removed fixed `worldWidth` and `worldHeight` from Viewport constructor to allow flexible coordinate ranges including negative coordinates.
  - Verified that `underflow: 'center'` now correctly uses the calculated cluster/system bounds for centering.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`
- **Context**: Resolving a bug where the viewport was stuck at (0, 0) because of default world boundaries in the clamp plugin.

### [2026-05-16] - Fix Star Map viewport centering

- **Summary**: The star map viewport and clamping logic were hardcoded to (0, 0), causing clusters to appear off-center.
- **Changes**: 
  - Implemented geometric center calculation for the star cluster in `StarMap.svelte`.
  - Updated `maxClusterRadius` to be relative to the calculated cluster center.
  - Updated viewport positioning and clamping to use the dynamic cluster center.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `e2e-tests/wdio.conf.js` (fix build)
- **Context**: Ensuring the star map is correctly centered regardless of the random generation's offset.

###### [2026-05-16] - Resolve UI Linting and Accessibility Issues

- **Summary**: Resolved multiple linting and accessibility issues across core UI components to improve code quality and reactivity.
- **Changes**:
  - Replaced plain `Map` with `SvelteMap` in `StarMap.svelte` to resolve Svelte 5 reactivity warnings.
  - Fixed missing keys in `{#each}` blocks within `HelpOverlay.svelte` and `Inspector.svelte`.
  - Removed unused variables and cleaned up dead code in `Navigation.svelte` and `StarMap.svelte`.
  - Enhanced ARIA roles and accessibility attributes in `Inspector.svelte` and `HelpOverlay.svelte`.
  - Verified all changes using `npm run lint`, `npm run check`, and unit tests.
- **Files Affected**: `src/lib/components/HelpOverlay.svelte`, `src/lib/components/Navigation.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/Inspector.svelte`.
- **Context**: None.

###### [2026-05-16] - Improve Map Viewport UX

- **Summary**: Enhanced the star map and solar system map by ensuring content visibility, maintaining 60% viewport coverage, and implementing robust panning constraints.
- **Changes**:
  - Implemented initial fit logic for `StarMap` to ensure all stars are visible upon loading.
  - Replaced manual panning prevention with `viewport.clamp` in both `StarMap` and `SolarSystemMap`.
  - Updated `resizeHandler` in both map components to dynamically recalculate zoom and pan limits.
  - Exposed `window.starMapDebug` to allow automated verification of viewport state.
  - Added E2E tests to verify initial fit and zoom constraints for the Star Map.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`, `e2e-tests/test/specs/zoom-ux.e2e.js`.
- **Context**: None.

###### [2026-05-16] - Advanced Map Highlighting & UI/UX Refinement

- **Summary**: Implemented interactive highlighting for orbits and portals, and finalized overall UI/UX improvements.
- **Changes**:
  - Added interactive ring-hit-area orbits in `SolarSystemMap`.
  - Added interactive line-hit-area portals in `StarMap`.
  - Implemented bidirectional highlighting for hovered and selected entities and their orbits/portals.
  - Verified and refined Navigation, Search, Inspector, and Help overlay components.
  - Ensured comprehensive unit test coverage for all new UI components.
- **Files Affected**: `src/lib/components/SolarSystemMap.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/Navigation.svelte`, `src/lib/components/Inspector.svelte`, `src/lib/components/HelpOverlay.svelte`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/lib/components/Navigation.test.ts`, `src/lib/components/Inspector.test.ts`, `src/lib/components/HelpOverlay.test.ts`.
- **Context**: None.

###### [2026-05-16] - UI & UX Improvements

- **Summary**: Enhanced navigation, editing interface, and visual feedback to improve overall usability and accessibility.
- **Changes**:
  - Added Navigation component with breadcrumbs and system search functionality.
  - Implemented HelpOverlay component for keyboard shortcut documentation.
  - Enhanced Inspector with auto-focus and keyboard shortcuts.
  - Added visual feedback for hover and selection in PIXI maps.
  - Integrated Navigation and HelpOverlay into the main application layout.
  - Added unit tests for Navigation, Inspector, and HelpOverlay components.
- **Files Affected**: `src/lib/components/Navigation.svelte`, `src/lib/components/HelpOverlay.svelte`, `src/lib/components/Inspector.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/lib/components/Navigation.test.ts`, `src/lib/components/Inspector.test.ts`, `src/lib/components/HelpOverlay.test.ts`.
- **Context**: None.

### [2026-05-16] - Lint Task & Issue Fixes

- **Summary**: Fixed the `lint` task to show all errors and resolved 43 linting issues across the project.
- **Changes**:
  - Swapped `eslint` and `prettier` execution order in `package.json` to ensure linting errors are displayed even if formatting issues exist.
  - Added WebdriverIO/Mocha globals for `e2e-tests` in `eslint.config.js`.
  - Fixed Svelte 5 reactivity warnings by using `SvelteMap` in `SolarSystemMap.svelte`.
  - Resolved multiple `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` errors.
  - Fixed `svelte/require-each-key` error in `Inspector.svelte`.
  - Cleaned up unused variable `snapTargetId` in `StarMap.svelte`.
- **Files Affected**: `package.json`, `eslint.config.js`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/Inspector.svelte`, `src/lib/components/Inspector.test.ts`, `src/routes/+layout.svelte`.

### [2026-05-16] - Zoom UX UI Regression Tests

- **Summary**: Added E2E regression tests for the Solar System view and instrumented the code for better testability.
- **Changes**:
  - Created `e2e-tests/test/specs/zoom-ux.e2e.js` to verify initial system fitting, logarithmic zoom limits, and hierarchical size constraints.
  - Instrumented `SolarSystemMap.svelte` to expose PIXI application state via `window.solarSystemMapDebug` for inspection by WebdriverIO.
  - Added unit tests in `scaling.test.ts` to verify composite clamping logic.
- **Files Affected**: `e2e-tests/test/specs/zoom-ux.e2e.js`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/pixi/scaling.test.ts`.

### [2026-05-16] - Satellite Scaling Refinement

- **Summary**: Increased the visual size difference between satellites and their parent objects for better hierarchical clarity.
- **Changes**:
  - Adjusted `getVisualRadius` formula to `4 + Math.log10(radius_km) * 6` to increase the visual spread between bodies of different physical sizes.
  - Stiffened the hierarchical size constraint in `getClampedScale`, reducing the maximum satellite-to-parent radius ratio from `0.8` to `0.4`.
  - Updated unit tests to reflect the new scaling constants and ensure consistent hierarchy enforcement.
- **Files Affected**: `src/lib/pixi/scaling.ts`, `src/lib/pixi/scaling.test.ts`.

### [2026-05-16] - Satellite Scaling Fix

- **Summary**: Fixed a bug where satellites (moons) could appear larger than their parent objects when zoomed out.
- **Changes**:
  - Implemented `getClampedScale` in `scaling.ts` to unify scaling logic and enforce parent-child size constraints.
  - Added a constraint ensuring satellite visual radius is at most 80% of its parent's visual radius.
  - Updated `SolarSystemMap.svelte` to track object hierarchy and propagate visual radius limits.
  - Added unit tests in `scaling.test.ts` to verify clamping logic and prevent size regressions.
- **Files Affected**: `src/lib/pixi/scaling.ts`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/pixi/scaling.test.ts`.

### [2026-05-16] - Logarithmic Zoom Scaling & Improved System Visibility

- **Summary**: Improved the Solar System view UX by implementing logarithmic scaling for distances and sizes, ensuring full system visibility on entry, and refining zoom limits.
- **Changes**:
  - Implemented `Math.log10(au * 100 + 1) * config.auToPixels / 2` for orbital distances to better balance satellite orbits and distant planets.
  - Implemented `5 + Math.log10(radius_km) * 4` for visual radii of all celestial bodies (stars, planets, moons).
  - Set `log` scale mode as the default for solar systems.
  - Added initial viewport fitting to `SolarSystemMap` to show the entire system upon entry.
  - Updated zoom limits to cap focused objects at 80% viewport size, excluding satellites.
  - Adjusted satellite visibility threshold to 10 pixels for better system-wide context.
  - Unified star and body radius calculations using the same logarithmic model.
- **Files Affected**: `src/lib/pixi/scaling.ts`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/pixi/scaling.test.ts`.

### [2026-05-16] - Zoom Flicker Fix

- **Summary**: Resolved UI flickering and jitter when reaching zoom limits in StarMap and SolarSystemMap.
- **Changes**:
  - Implemented a small epsilon threshold for `zoomingIn` detection to prevent floating-point oscillation at boundaries.
  - Added caching for zoom limits to avoid redundant and expensive `clampZoom` plugin re-configurations.
  - Increased focus "stickiness" (hysteresis) during active zoom-in to prevent target flip-flopping.
  - Fixed scope errors where `currentScale` was missing in `updateFocus` calls.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`.

### [2026-05-16] - Fluent Zoom Jitter Fix

- **Summary**: Resolved "jumping" UI behavior during zoom by replacing conflicting snap animations with a direct viewport nudge.
- **Changes**:
  - Replaced `viewport.snap` in `zoomed` handlers with a direct proportional nudge (lerp) to avoid fighting with the `wheel` zoom plugin.
  - Implemented focus hysteresis in `StarMap` and `SolarSystemMap` to prevent rapid target flip-flopping when the mouse is between objects.
  - Improved focus stability by using unique IDs for tracking instead of transient object literals.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`.

### [2026-05-16] - Fluent Zoom & Dynamic Limits

- **Summary**: Implemented context-aware zoom limits and fluent navigation to improve map exploration.
- **Changes**:
  - Implemented dynamic zoom-out limits using a 60% viewport rule to maintain orientation.
  - Added proximity-based focus detection during zoom to identify the closest system or body to the mouse pointer.
  - Implemented context-sensitive zoom-in limits based on the focused object's boundaries (planetary systems or satellites).
  - Added auto-centering and pan-disabling at the minimum zoom level for improved clarity.
  - Implemented smooth auto-centering towards the focused object when zooming in.
  - Optimized hierarchical world-coordinate tracking for efficient proximity calculations in solar systems.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`.

### [2026-05-16] - Multi-Star System Refinement & Star-Level Regions

- **Summary**: Enhanced multi-star system generation with overlap verification and hierarchical orbital regions.
- **Changes**:
  - Added `orbital_regions` to `Star` model in Rust and TypeScript.
  - Implemented stable orbit limits in `generation.rs` to prevent planetary systems from overlapping with neighboring stars.
  - Added procedural generation of orbital regions (asteroid belts) for individual stars.
  - Updated `SolarSystemMap.svelte` to distribute stars and orbital bodies evenly along their orbits using angular offsets.
  - Enhanced rendering to include star-level orbital regions and updated adaptive scaling logic.
  - Added region display to the `Inspector` panel.
- **Files Affected**: `src-tauri/src/models.rs`, `src-tauri/src/generation.rs`, `src/lib/types/stellar.ts`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/components/Inspector.svelte`.

### [2026-05-16] - Multi-Star System Implementation

- **Summary**: Enhanced the application to support realistic binary and trinary star systems with individual planetary systems.
- **Changes**:
  - Updated `Star` model in Rust and TypeScript to support `orbit_au` and nested `satellites`.
  - Refactored `generation.rs` to create barycentric orbits for multi-star systems and distribute planets among stars.
  - Implemented hierarchical rendering in `SolarSystemMap.svelte`, allowing stars to orbit the system barycenter while hosting their own planetary systems.
  - Updated `Inspector.svelte` with recursive persistence logic and fixed TypeScript narrowing issues.
  - Unified adaptive scaling and constant-thickness rendering across the new hierarchical structure.
- **Files Affected**: `src-tauri/src/models.rs`, `src/lib/types/stellar.ts`, `src-tauri/src/generation.rs`, `src/lib/components/SolarSystemMap.svelte`, `src/lib/components/Inspector.svelte`

### [2026-05-16] - Adaptive Scale and Label Readability

- **Summary**: Enhanced orbital body rendering to ensure labels stay readable and icons avoid overlap with parents.
- **Changes**:
  - Implemented label scale compensation to maintain constant screen size regardless of parent icon clamping.
  - Added parent-overlap avoidance for all orbital bodies (planets and moons).
  - Refined clamping logic to only consider visible satellites, preventing bodies from shrinking due to hidden/culled moons.
  - Unified scaling formulas for stars and orbital bodies to ensure a consistent 10% safety gap between icons.
- **Files Affected**: `src/lib/components/SolarSystemMap.svelte`

### [2026-05-16] - Adaptive Scaling for Orbital Bodies

- **Summary**: Implemented adaptive visual scaling for planets and moons based on their physical radius.
- **Changes**:
  - Implemented a square-root based formula to map `radius_km` to a visual radius, providing a realistic sense of relative sizes.
  - Added adaptive clamping for orbital bodies to prevent overlap with their satellites' orbits during zoom.
  - Optimized `SolarSystemMap` by removing redundant constant-size tracking in favor of unified clamping logic.
- **Files Affected**: `src/lib/components/SolarSystemMap.svelte`

### [2026-05-16] - Adaptive Star Scaling

- **Summary**: Implemented adaptive star scaling to prevent overlap with satellite orbits during zoom.
- **Changes**:
  - Added logic to `SolarSystemMap` to identify the minimum orbit radius.
  - Implemented dynamic clamping for star visual scale based on minimum orbit world coordinates.
  - Ensured stars maintain constant visual size when possible, but scale down to stay within orbits when zoomed out.
- **Files Affected**: `src/lib/components/SolarSystemMap.svelte`

### [2026-05-16] - Constant Line Thickness Rendering

- **Summary**: Ensured orbits and portal connections maintain a constant visual thickness across all zoom levels.
- **Changes**:
  - Implemented dynamic re-drawing for portal jump connections in `StarMap` to adjust stroke width based on viewport scale.
  - Implemented dynamic re-drawing for orbital paths in `SolarSystemMap` to maintain 1px screen thickness regardless of zoom.
  - Optimized viewport event handlers to synchronize line thickness updates during zooming.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`

### [2026-05-16] - Rendering Readability & Zoom Optimization

- **Summary**: Improved label readability and object scaling across zoom levels.
- **Changes**:
  - Implemented constant-size scaling for star systems, planets, and labels using viewport-inverse scaling.
  - Added proximity-based culling for satellites (moons) to prevent overlap with parent bodies when zoomed out.
  - Optimized memory usage by explicitly destroying PIXI objects during re-renders.
  - Ensured labels maintain a consistent screen size for better legibility at all zoom levels.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`

### [2026-05-16] - UI Interaction & Responsiveness Fixes

- **Summary**: Fixed intermittent pan/zoom issues and unreliable solar system navigation.
- **Changes**:
  - Implemented resize synchronization between Pixi renderer and `pixi-viewport`.
  - Switched to `pointertap` for more robust double-click detection in StarMap.
  - Optimized rendering reactivity to prevent double-renders on mount.
  - Added event stopPropagation to interactive nodes to prevent event bubbling issues.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`

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
