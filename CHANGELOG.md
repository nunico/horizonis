# Changelog

All notable changes to the Horizonis project by AI agents will be documented in this file.

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
