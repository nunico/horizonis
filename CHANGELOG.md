# Changelog

###### [2026-06-17] - Pluggable map render styles for StarMap and SolarSystemMap

- **Summary**: Implemented a pluggable, swappable map-style system with live switching, persistence, and JSON import/export.
- **Changes**:
  - Added `MapStyle` runtime contract and `StyleDefinition` JSON-serializable format under `apps/client/src/lib/styles/`.
  - Implemented declarative renderer (`createDeclarativeStyle`) for safe style sharing without code execution.
  - Added optional hand-written `MapStyle` code escape-hatch for advanced customization.
  - Added two built-in styles: "Realistic Star Field" (dark space, spectral gradients, shaded planets) and "Tactical CRT" (mint-on-black, scanlines, simple primitives).
  - Added live style switching via `StylePicker` dropdown in the navigation bar with JSON export.
  - Added style import with validation and persistent storage (localStorage, works in web and Tauri desktop).
  - Extended star coloring to full OBAFGKM spectral sequence per stellar classification docs.
  - Added Vitest tests for style registry, palette/spectral resolution, validation, persistence, renderer, and store; component tests for maps and picker; Playwright E2E for switching, import, and reload persistence.
- **Files Affected**: apps/client/src/lib/styles/*, apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/SolarSystemMap.svelte, apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/stores/*, apps/client/src/lib/theme.ts
- **Context**: Decoupling appearance from layout/interaction enables user theming while maintaining clean architecture. Declarative JSON-based styles provide a safe sharing path without runtime code execution.

###### [2026-06-17] - GitHub Actions CI/CD pipelines

- **Summary**: Added GitHub Actions workflows for automated testing, linting, and cross-platform desktop builds.
- **Changes**:
  - Created `.github/workflows/ci.yml` (push to main and PRs): runs pnpm nx run-many --targets=check,lint,test and cargo test --workspace --locked on ubuntu-22.04.
  - Created `.github/workflows/release.yml` (semver tags): cross-platform builds (macOS universal, Linux x86_64, Windows x86_64) using tauri-apps/tauri-action, attaches installers to draft GitHub Release.
  - Both workflows cache pnpm store and Rust build artifacts; CI uses jdx/mise-action to honor mise.toml/mise.lock.
- **Files Affected**: .github/workflows/ci.yml, .github/workflows/release.yml
- **Context**: None.

###### [2026-06-17] - UX Phase 5 — responsiveness and layering

- **Summary**: Make the layout work on narrow viewports, single-source the navbar height, and fix map layering.
- **Changes**:
  - Drive the top nav height from LAYOUT.navbarHeightPx (inline style) so the same token feeds the rendered bar and the viewport clamp math.
  - Inspector spans full width (minus margins) below the sm breakpoint and is a fixed 320px panel from sm up.
  - Capped the SystemList width to the viewport and narrowed the search input on small screens so the nav bar no longer overflows.
  - Enabled sortableChildren and assigned zIndex (portals 0, selection 1, hover 2, system nodes 10) so system labels always render above portal/selection/hover graphics.
- **Files Affected**: apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/components/SystemList.svelte, apps/client/src/lib/components/StarMap.svelte
- **Context**: None.

###### [2026-06-17] - UX Phase 4 — accessibility

- **Summary**: Add modal focus management, a contrast/icon pass, and a keyboard/screen-reader path to systems.
- **Changes**:
  - Added a focusTrap Svelte action (focus container on open, cycle Tab within it, restore focus to the trigger on close); applied to Inspector, HelpOverlay and ConfirmDialog.
  - Bumped tiny 10px labels to text-xs and lightened low-contrast slate-500/600 label text toward WCAG AA across Inspector, Navigation and the system caption.
  - Marked decorative lucide icons in labeled controls with aria-hidden.
  - Added an Announcer live region narrating the current view (cluster vs named system) for screen readers.
  - Added a SystemList disclosure: a labelled, keyboard-operable list of systems that can be opened without the canvas.
  - Gave the top navigation bar aria-label="Primary" to distinguish it from the new Systems nav landmark.
  - Added Vitest tests for focusTrap, Announcer, and SystemList.
- **Files Affected**: apps/client/src/lib/actions/focusTrap.ts, apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/components/HelpOverlay.svelte, apps/client/src/lib/components/ConfirmDialog.svelte, apps/client/src/lib/components/Announcer.svelte, apps/client/src/lib/components/SystemList.svelte, apps/client/src/lib/components/Navigation.svelte, apps/client/src/routes/+page.svelte
- **Context**: The SystemList adds a second nav landmark, so E2E nav locators were scoped to the Primary nav.

###### [2026-06-16] - UX Phase 3 — search keyboard navigation and help accuracy

- **Summary**: Make the search dropdown keyboard-navigable and bring the help overlay in line with current shortcuts.
- **Changes**:
  - Added arrow Up/Down navigation (wrapping), Enter-to-select, and a highlighted active row to the Navigation search results.
  - Marked the search input as a combobox controlling the results listbox (aria-expanded/controls, role=option, aria-selected).
  - Extracted a tested nextIndex reducer (lib/utils/listNav.ts).
  - Updated HelpOverlay to document Undo (Ctrl/Cmd+Z) and search arrow-key navigation, and to clarify that drag-to-rearrange is Star Map only.
  - Added Vitest tests for nextIndex, the search arrow/Enter flow, and the updated help content.
- **Files Affected**: apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/utils/listNav.ts, apps/client/src/lib/components/HelpOverlay.svelte
- **Context**: None.

###### [2026-06-16] - E2E coverage for UX Phases 1-2

- **Summary**: Add Playwright E2E specs for the feedback and interaction-model changes and make the system map E2E-debuggable.
- **Changes**:
  - Added tests/ux-feedback.spec.ts: save shows a 'Changes saved' toast; regenerate via the in-app dialog then Ctrl+Z restores the previous cluster; empty cluster shows the empty state and can generate.
  - Added tests/interaction-model.spec.ts: click-without-move keeps a system's position and selects it; sub-threshold drag does not move it; selecting does not focus the name field; Inspector 'Open System' enters the system; Linear/Log toggle preserves the zoom ratio.
  - Updated tests/navigation-flow.spec.ts regenerate test to confirm via the in-app ConfirmDialog instead of window.confirm.
  - Extracted isE2EDebugEnabled() and used it in both maps so the system map's debug hooks and e2eSystemReady flag activate under Playwright.
  - Replaced pre-existing 'as any' casts in tests/system-rearrangement.spec.ts with typed shapes.
- **Files Affected**: apps/web-e2e/tests/ux-feedback.spec.ts, apps/web-e2e/tests/interaction-model.spec.ts, apps/web-e2e/tests/navigation-flow.spec.ts, apps/web-e2e/tests/system-rearrangement.spec.ts, apps/client/src/lib/utils/e2e.ts, apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/SolarSystemMap.svelte
- **Context**: The Linear/Log camera assertion checks the zoom ratio (mapping-independent) rather than absolute center, which the viewport clamp can shift. 23 E2E tests pass.

###### [2026-06-16] - UX Phase 2 — interaction model fixes

- **Summary**: Make canvas interactions predictable: drag threshold, no auto-pan, preserved scale-toggle camera, calmer Inspector focus, explicit open-system.
- **Changes**:
  - Fixed pre-existing ESLint errors in StarMap (unused const, Map→SvelteMap, removed 'as any', typed test mocks).
  - Inspector no longer auto-focuses the Name input; focus moves to the panel container instead.
  - Removed the auto-pan-on-zoom nudge in StarMap and SolarSystemMap; rely on pixi-viewport wheel zoom-to-cursor.
  - Preserve camera framing across the Linear/Log toggle via a new tested pixelsToAu inverse (capture AU center + zoom ratio, re-frame after re-render).
  - Added a drag threshold for Star Map system nodes (exceedsDragThreshold helper): a press selects and only becomes a drag past the threshold; node elevated while dragging.
  - Added an explicit 'Open System' action to the Inspector for systems; double-click on the map remains the fast path.
  - Added Vitest tests for pixelsToAu round-trips, exceedsDragThreshold, the new drag-threshold flow, and the Inspector open/focus changes.
- **Files Affected**: apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/SolarSystemMap.svelte, apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/pixi/scaling.ts, apps/client/src/lib/utils/drag.ts
- **Context**: Linear/Log camera preservation maps the center through AU because the pixel mapping changes between modes. The double-click open path is kept but now has a non-timer alternative.

###### [2026-06-16] - UX Phase 1 — feedback, forgiveness, and empty states

- **Summary**: Add user feedback (toasts), in-app regenerate confirmation, undo, and an empty-state for clusters with no systems.
- **Changes**:
  - saveCluster returns a success boolean and shows an error toast on failure; generateNewCluster shows an error toast on failure.
  - Inspector shows a 'Changes saved' toast only when a save persists.
  - Added reusable ConfirmDialog component; Navigation replaces window.confirm with an in-app dialog (spinner, disabled actions during generation, success toast).
  - Added snapshot-based undo (Ctrl/Cmd+Z): history store, resolveShortcut 'undo' action, global dispatch with 'Undone'/'Nothing to undo' toast.
  - Record undo snapshots before regenerate and before a Star Map system move; skip save when a node is clicked without moving.
  - Added EmptyState overlay over the Star Map when the cluster has no systems, with a one-click generate action.
  - Added Vitest tests for ConfirmDialog, history store, EmptyState, and the new toast/undo paths.
- **Files Affected**: apps/client/src/lib/stores/clusterData.ts, apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/components/ConfirmDialog.svelte, apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/stores/history.ts, apps/client/src/lib/actions/shortcuts.ts, apps/client/src/routes/+layout.svelte, apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/EmptyState.svelte, apps/client/src/routes/+page.svelte
- **Context**: Undo is single-stack and snapshot-based (deep-cloned, capped at 20). The empty-state generate skips confirmation since there is no data to replace.

###### [2026-06-16] - UX Foundations: design tokens, toasts, unified shortcuts, and tooling fix

- **Summary**: Establish shared UX foundations (Phase 0) and fix pnpm so dev scripts run non-interactively.
- **Changes**:
  - Added $lib/theme.ts design tokens (MAP_COLORS, LAYOUT, INTERACTION, getSpectralColor/getBodyTypeColor); replaced color literals and magic numbers in canvas components.
  - Added $lib/stores/toast.ts and Toast.svelte (aria-live), mounted in +page.svelte.
  - Added pure resolveShortcut() reducer and $lib/stores/ui.ts; consolidated keyboard handlers into one dispatcher in +layout.svelte; documented double-click-to-open in HelpOverlay.
  - Set verifyDepsBeforeRun:false and confirmModulesPurge:false in pnpm-workspace.yaml; replaced build-approval placeholders with explicit booleans.
  - Added .claude/agents/changelog-writer.md (Claude Code-native).
  - Added Vitest tests for theme, toast, Toast, and shortcut reducer; updated Navigation and HelpOverlay tests.
- **Files Affected**: apps/client/src/lib/theme.ts, apps/client/src/lib/stores/toast.ts, apps/client/src/lib/components/Toast.svelte, apps/client/src/lib/actions/shortcuts.ts, apps/client/src/lib/stores/ui.ts, apps/client/src/routes/+layout.svelte, apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/components/HelpOverlay.svelte, pnpm-workspace.yaml, .claude/agents/changelog-writer.md
- **Context**: Phase 0 foundations that later UX phases build on; the pnpm change is required for non-interactive script runs.

###### [2026-05-22] - System Rearrangement in Star Map

- **Summary**: Allow users to rearrange solar systems within a cluster by dragging them on the Star Map.
- **Changes**:
  - Added drag-and-drop functionality to solar system nodes in `StarMap.svelte`.
  - Implemented real-time updates for connecting portals during dragging.
  - Persisted new coordinates to localStorage via `saveCluster`.
  - Updated `HelpOverlay.svelte` with the new drag system interaction.
  - Added unit tests in `StarMap.test.ts`.
  - Added E2E tests in `apps/web-e2e/tests/system-rearrangement.spec.ts`.
  - Fixed a bug in `clusterData.ts` where E2E fixtures were not correctly prioritized over random cluster generation.
- **Files Affected**: `apps/client/src/lib/components/StarMap.svelte`, `apps/client/src/lib/components/HelpOverlay.svelte`, `apps/client/src/lib/components/StarMap.test.ts`, `apps/client/src/lib/stores/clusterData.ts`, `apps/web-e2e/tests/system-rearrangement.spec.ts`
- **Context**: Real-time portal updates provide immediate visual feedback while dragging, ensuring a smooth UX. Fixed E2E fixture prioritization to prevent non-deterministic test failures during cluster loading.

###### [2026-05-22] - Fix ESLint 'any' type violations in E2E tests and main app

- **Summary**: Replaced `any` with specific types in E2E tests and main application to improve type safety and remove ESLint silencers.
- **Changes**:
  - Replaced `any` with specific types in `apps/web-e2e/tests` and `apps/client/src`.
  - Updated `Window` and `E2EWindow` interfaces for better type safety.
  - Removed all `@typescript-eslint/no-explicit-any` ESLint silencers.
- **Files Affected**: `apps/web-e2e/tests/types.ts`, `apps/web-e2e/tests/*.spec.ts`, `apps/client/src/app.d.ts`
- **Context**: Standardizing on strict typing to prevent runtime errors and improve developer experience.

###### [2026-05-22] - Viewport Offset Fix and Layout Standardization

- **Summary**: Standardized UI layout to fixed positioning with consistent clearance to prevent viewport offsets.
- **Changes**:
  - Switched `Navigation.svelte` and `Inspector.svelte` to `fixed` positioning.
  - Set `StarMap.svelte` and `SolarSystemMap.svelte` to `absolute inset-0`.
  - Standardized top offset to `top-20` (80px) for consistent clearance of the navigation bar.
  - Updated `.junie/STATE.md` with new layout decisions.
  - Added `viewport-offset.spec.ts` regression test in Playwright.
- **Files Affected**: apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/SolarSystemMap.svelte, .junie/STATE.md, apps/web-e2e/tests/viewport-offset.spec.ts
- **Context**: Previous `top-18` offset was insufficient for some viewport sizes; `top-20` provides consistent 80px clearance. Fixed positioning prevents the entire viewport from shifting when interactive panels are opened.

###### [2026-05-22] - Fix UI overlap and resolve pre-existing type errors

- **Summary**: Adjusted layout positioning to prevent navigation bar overlap and fixed pre-existing type and linting issues.
- **Changes**:
  - Moved `Inspector.svelte` and `SolarSystemMap.svelte` controls from `top-4` to `top-18` to avoid overlap with the navigation bar.
  - Resolved type errors in `stellar.ts` and `SolarSystemMap.svelte`.
  - Fixed ESLint violation in `Navigation.test.ts`.
  - Added Playwright regression test `layout-obscurity.spec.ts` to verify layout integrity.
  - Applied Prettier formatting to `Navigation.svelte` and `clusterData.test.ts`.
- **Files Affected**: apps/client/src/lib/components/Inspector.svelte, apps/client/src/lib/components/SolarSystemMap.svelte, apps/client/src/lib/utils/stellar.ts, apps/client/src/lib/components/Navigation.test.ts, apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/stores/clusterData.test.ts, apps/web-e2e/tests/layout-obscurity.spec.ts
- **Context**: The `top-18` offset accounts for the height of the fixed navigation bar, ensuring controls remain accessible.

###### [2026-05-21] - Cluster Regeneration & Viewport Centering

- **Summary**: Added cluster regeneration capability and fixed viewport centering to ensure clusters are correctly positioned on load and generation.
- **Changes**:
  - Implemented `generateNewCluster` in `clusterData` store to interface with storage providers and WASM generator.
  - Added a "Regenerate" button with confirmation dialog to the `Navigation` component.
  - Rebuilt `procedural-gen` WASM to enforce PascalCase property consistency across the API.
  - Removed redundant `moveCenter(0,0)` calls in `StarMap` and `SolarSystemMap` that overrode correct centering logic.
  - Optimized `StarMap` rendering sequence to ensure stores settle before centering the viewport.
  - Added unit tests for `clusterData` store and E2E tests for the regeneration flow.
- **Files Affected**: apps/client/src/lib/stores/clusterData.ts, apps/client/src/lib/components/Navigation.svelte, apps/client/src/lib/components/StarMap.svelte, apps/client/src/lib/components/SolarSystemMap.svelte, libs/procedural-gen/pkg/procedural_gen.d.ts, libs/procedural-gen/src/wasm.rs, apps/web-e2e/tests/navigation-flow.spec.ts
- **Context**: PascalCase consistency ensures the WASM-generated data matches the TypeScript interfaces exactly without manual mapping. Fixed centering issues where the viewport would default to (0,0) before the cluster data was fully rendered.

###### [2026-05-21] - Refactor StarMap.svelte to reduce complexity

- **Summary**: Modularized StarMap and SolarSystemMap by extracting spatial logic and PIXI setup.
- **Changes**:
  - Extracted spatial grid and culling logic to `lib/utils/spatial.ts`.
  - Created a centralized PIXI/Viewport initialization utility in `lib/pixi/setup.ts`.
  - Extracted shared stellar and portal logic to `lib/utils/stellar.ts`.
  - Decomposed the `renderCluster` function in `StarMap.svelte` into focused helper functions.
  - Refactored `SolarSystemMap.svelte` to use the shared PIXI setup utility.
  - Improved type safety for Viewport and PIXI objects throughout the codebase.
- **Files Affected**:
  - apps/client/src/lib/components/StarMap.svelte
  - apps/client/src/lib/components/SolarSystemMap.svelte
  - apps/client/src/lib/utils/spatial.ts
  - apps/client/src/lib/utils/stellar.ts
  - apps/client/src/lib/pixi/setup.ts
- **Context**: Reduces technical debt by separating rendering infrastructure from business logic and improves testability of spatial operations.

### [2026-05-21] - E2E (web): readiness-first waits and cluster snapshot helper across specs

- **Summary**: Converted web specs to readiness-first and cluster snapshot; strengthened zoom-ux retry restoring activeSystemId.
- **Changes**:
  - apps/e2e-tests/test/specs/map-rendering.e2e.js: add e2eReady/e2eSystemReady; use getClusterSnapshot(); fix debug hook.
  - apps/e2e-tests/test/specs/navigation-flow.e2e.js: add e2eReady; await e2eSystemReady; use getClusterSnapshot().
  - apps/e2e-tests/test/specs/responsiveness.e2e.js: add e2eReady; use getClusterSnapshot(); await e2eSystemReady.
  - apps/e2e-tests/test/specs/zoom-ux.e2e.js: retry restores activeSystemId before re-entering system view.
- **Files Affected**:
  - apps/e2e-tests/test/specs/map-rendering.e2e.js
  - apps/e2e-tests/test/specs/navigation-flow.e2e.js
  - apps/e2e-tests/test/specs/responsiveness.e2e.js
  - apps/e2e-tests/test/specs/zoom-ux.e2e.js
- **Context**: Reduce flakiness from instrumentation timing; prefer readiness flags and data-driven checks over direct probes.

### [2026-05-19] - Reorganization of apps and targets

- **Summary**: Reorganized `apps/web` to `apps/client` and `apps/desktop` to `apps/shell` to clarify the distinction between source code modules and build targets.
- **Changes**:
  - Moved `apps/web` to `apps/client` and `apps/desktop` to `apps/shell`.
  - Renamed Nx projects to `horizonis-client` and `horizonis-shell`.
  - Updated root scripts to follow `<command>:<target>` pattern (e.g., `build:web`, `dev:desktop`).
  - Enhanced E2E tests with auto-starting web server and dual-target support.
  - Exposed `window.stores` in production builds when `navigator.webdriver` is true to support E2E testing against production builds.
- **Files Affected**: root `package.json`, `apps/client/*`, `apps/shell/*`, `apps/e2e-tests/wdio.conf.js`, root `Cargo.toml`.
- **Context**: This change separates the "what" (client/shell) from the "how" (web/desktop build targets).

### [2026-05-19] - Fix runtime TypeError and resolve 39 code analysis errors

- **Summary**: Fixed runtime crash in Navigation.svelte and SolarSystemMap.svelte by adding safer optional chaining. Resolved 39 type-related errors by standardizing imports to $lib alias and adding explicit type guards in Inspector.svelte. Added regression tests.
- **Changes**:
  - Added safer optional chaining in `Navigation.svelte` and `SolarSystemMap.svelte` to prevent runtime `TypeError`.
  - Standardized imports in `apps/web` to use `$lib` alias, resolving unresolved type references.
  - Added explicit type guards and improved type safety in `Inspector.svelte`.
  - Added regression tests for cluster state edge cases in `Navigation.test.ts`.
  - Synchronized `svelte-check` and IDE analysis by ensuring correct `tsconfig` resolution.
- **Files Affected**:
  - apps/web/src/lib/components/Navigation.svelte
  - apps/web/src/lib/components/SolarSystemMap.svelte
  - apps/web/src/lib/components/StarMap.svelte
  - apps/web/src/lib/components/Inspector.svelte
  - apps/web/src/lib/stores/appState.ts
  - apps/web/src/lib/stores/clusterData.ts
  - apps/web/src/lib/components/Navigation.test.ts
  - apps/web/src/lib/components/Inspector.test.ts
- **Context**: Resolved a discrepancy between WebStorm and CLI analysis by verifying `.svelte-kit/tsconfig.json` sync and fixing relative import paths.

### [2026-05-19] - Lint fixes for horizonis-web (@apps/web)

- **Summary**: Ran ESLint and Prettier on @apps/web; resolved all lint errors and formatting issues so that `nx run horizonis-web:lint` passes.
- **Changes**:
  - Removed unused `SolarSystem` type import in `SolarSystemMap.svelte`.
  - Replaced `any` and `Function` types in `StarMap.test.ts` and `SolarSystemMap.test.ts` with explicit, safe typings.
  - Adjusted mocks to avoid implicit `any` on `this` and properties.
  - Formatted affected files with Prettier.
- **Files Affected**:
  - apps/web/src/lib/components/SolarSystemMap.svelte
  - apps/web/src/lib/components/StarMap.test.ts
  - apps/web/src/lib/components/SolarSystemMap.test.ts
- **Context**: Enforced TypeScript lint rules (`@typescript-eslint/no-explicit-any`, `no-unused-vars`, and `no-unsafe-function-type`) while preserving test behavior.

### [2026-05-19] - Comprehensive Test Suite Expansion and Component Reliability

- **Summary**: Increased test coverage and fixed non-determinism, connectivity, and reactivity issues across Rust and Svelte components.
- **Changes**:
  - Added comprehensive proptests and unit tests for `procedural-gen` (invariants, seeding, connectivity).
  - Fixed non-determinism in cluster generation caused by `Uuid::new_v4()` and `HashSet` iteration.
  - Guaranteed cluster connectivity using DSU in the generation algorithm.
  - Enhanced `routing.rs` with edge case and error handling tests.
  - Expanded `clusterData` store tests to cover Tauri integration and async error fallbacks.
  - Implemented `onDestroy` cleanup for PIXI.js in `StarMap.svelte` and `SolarSystemMap.svelte`.
  - Refactored `SolarSystemMap.svelte` to use `$derived` for system data, resolving a reactivity loop.
  - Added interaction tests for map components using Vitest and PIXI mocks.
- **Files Affected**: `libs/procedural-gen/src/generation.rs`, `libs/procedural-gen/src/routing.rs`, `apps/web/src/lib/stores/clusterData.ts`, `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/components/SolarSystemMap.svelte`.
- **Context**: Improved reliability of procedural generation and resolved potential memory leaks and reactivity loops in the UI.

### [2026-05-19] - TypeScript & Svelte 5 Quality Fixes

- **Summary**: Resolved 46+ TypeScript errors and Svelte 5 reactivity warnings.
- **Changes**:
  - Fixed Svelte 5 reactivity in `Inspector.svelte` by replacing `$derived` with `$state` + `$effect` for local mutable entity copy.
  - Augmented `Window` interface in `apps/web/src/app.d.ts` to include debug and E2E properties.
  - Added `apps/e2e-tests/tsconfig.json` to correctly type WebDriverIO tests and eliminate analysis errors.
  - Removed multiple redundant `@ts-expect-error` and `any` casts in map components.
- **Files Affected**: `apps/web/src/lib/components/Inspector.svelte`, `apps/web/src/app.d.ts`, `apps/e2e-tests/tsconfig.json`, `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/components/SolarSystemMap.svelte`, `apps/web/src/routes/+layout.svelte`.
- **Context**: Improved IDE experience and code robustness by ensuring 100% type safety and Svelte 5 idiomaticity.

### [2026-05-19] - Update Agent Guidelines for Code Quality & Multi-Target Support

- **Summary**: Updated `AGENTS.md` and E2E infrastructure to ensure quality across Web and Desktop targets.
- **Changes**:
  - Mandated type checking, linting, and formatting checks for both targets in `AGENTS.md`.
  - Updated `Standard Workflow` to include cross-target testing and quality checks.
  - Refactored `wdio.conf.js` to support switching between Web (Firefox) and Desktop (Tauri) E2E testing.
  - Verified Web/Desktop builds and unit tests are functional.
- **Files Affected**: `AGENTS.md`, `apps/e2e-tests/wdio.conf.js`, `CHANGELOG.md`
- **Context**: Added `TARGET=web` support to WDIO to allow testing without `tauri-driver` where necessary.

### [2026-05-18] - TypeScript & Type Safety Improvements

- **Summary**: Resolved all TypeScript compiler errors and cleaned up redundant type casts and directives.
- **Changes**:
  - Removed 23 unused `@ts-expect-error` directives in `StarMap.svelte` and `SolarSystemMap.svelte`.
  - Removed redundant `any` casts in `SolarSystemMap.svelte` to leverage PIXI v8's native type support.
  - Verified a clean state with zero errors and warnings across the web application using `svelte-check`.
- **Files Affected**: `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/components/SolarSystemMap.svelte`
- **Context**: Previous PIXI v8 type workarounds are no longer necessary as the compiler now correctly resolves the event types.

### [2026-05-18] - Code Quality & Linting Fixes

- **Summary**: Resolved multiple ESLint, Clippy, and Prettier issues across the monorepo.
- **Changes**:
  - Replaced `$state` + `$effect` with `$derived` in `Inspector.svelte` for better Svelte 5 idiomatic state handling.
  - Fixed `no-useless-assignment` in `Navigation.svelte` by utilizing the `showHelp` prop in the UI.
  - Standardized PIXI 8 event handling using `@ts-expect-error` instead of `any` casts in map components.
  - Removed unused imports and refined type narrowing for selected entities.
  - Fixed a redundant closure warning in the desktop app's Rust commands.
  - Applied project-wide formatting using Prettier.
- **Files Affected**: `apps/web/src/lib/components/Inspector.svelte`, `apps/web/src/lib/components/Navigation.svelte`, `apps/web/src/lib/components/StarMap.svelte`, `apps/desktop/src/commands.rs`, `apps/web/src/lib/components/Inspector.test.ts`
- **Context**: None.

### [2026-05-18] - Fix Code Review Issues

- **Summary**: Addressed feedback from code review to improve code quality, type safety, and performance.
- **Changes**:
  - Removed a duplicate changelog entry.
  - Replaced `SvelteMap` with standard `Map` for local temporary variables in `SolarSystemMap.svelte`.
  - Standardized PIXI event handling with consistent `@ts-expect-error` usage.
  - Improved type safety for `selectedEntity` in `StarMap.svelte`.
  - Refined WASM module URL resolution in `clusterData.ts`.
- **Files Affected**: `CHANGELOG.md`, `apps/web/src/lib/components/SolarSystemMap.svelte`, `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/stores/clusterData.ts`
- **Context**: None.

### [2026-05-18] - Fix WASM Loading in Web Version

- **Summary**: Fixed a bug where the `procedural-gen` WASM library failed to load in the web version due to incorrect path resolution by Vite.
- **Changes**:
  - Excluded `procedural-gen` from Vite's `optimizeDeps.exclude` to prevent it from being moved to `.vite/deps`.
  - Updated `initWasm` in `clusterData.ts` to explicitly import the WASM URL using Vite's `?url` suffix and pass it to the WASM initializer.
  - Ensured the WASM file is correctly resolved relative to the source code rather than the pre-bundled dependency location.
- **Files Affected**: `apps/web/vite.config.js`, `apps/web/src/lib/stores/clusterData.ts`
- **Context**: Vite's dependency pre-bundling can break WASM libraries that rely on `import.meta.url` for assets if they are not explicitly excluded or if asset paths are not handled correctly.

### [2026-05-18] - Fix Star Map Double-Click Interaction

- **Summary**: Resolved a bug where double-clicking a star failed to open the solar system map due to an unwanted reactivity dependency in Svelte 5.
- **Changes**:
  - Applied `untrack()` to `$selectedEntity` accesses in `StarMap.svelte` and `SolarSystemMap.svelte` to prevent full re-renders on selection.
  - Fixed a reactivity leak where updating the selection caused the entire cluster to be re-rendered, destroying nodes and resetting double-click timers.
  - Improved performance by reducing unnecessary PIXI application re-builds during map interaction.
- **Files Affected**: `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/components/SolarSystemMap.svelte`
- **Context**: Svelte 5 effects transitively track all reactive dependencies accessed within their call graph; `untrack()` is required to isolate interaction state from structural rendering.

### [2026-05-18] - Fix mise MCP server configuration

- **Summary**: Resolved compatibility issues with the mise MCP server by implementing a protocol adapter and aligning configuration with project standards.
- **Changes**:
  - Created `scripts/mise-mcp-adapter.cjs` to map legacy `list_tools` calls to `tools/list`.
  - Updated `.junie/mcp/mcp.json` to use the new adapter script.
  - Converted `.junie/mcp/mcp.json` indentation from spaces to tabs to match project style.
  - Enhanced the adapter to handle input stream processing more robustly.
- **Files Affected**: `scripts/mise-mcp-adapter.cjs`, `.junie/mcp/mcp.json`
- **Context**: The mise MCP server currently requires an experimental flag and does not natively support the legacy `list_tools` method.

### [2026-05-18] - Fix Test Suite and Svelte Component Typing Errors

- **Summary**: Resolved TypeScript typing errors in Svelte components and the web app's test suite by refining reactive state handling and ensuring proper integration of jest-dom matchers with Vitest.
- **Changes**:
  - Fixed `apps/web/src/lib/components/SolarSystemMap.svelte` by properly narrowing the `viewport` reactive state using local variables and guard clauses.
  - Added missing `vi` import from `vitest` and explicit `import '@testing-library/jest-dom/vitest'` to `Navigation.test.ts`.
  - Added `import '@testing-library/jest-dom/vitest'` to `Inspector.test.ts` and `HelpOverlay.test.ts` to fix missing matcher types.
  - Removed redundant and potentially masking type assertions (`as any`, `as unknown as StarCluster`) in test files to allow better type checking.
  - Updated `src/test/setup.ts` to use the correct Vitest-compatible `jest-dom` entry point.
- **Files Affected**: `apps/web/src/lib/components/SolarSystemMap.svelte`, `apps/web/src/lib/components/Navigation.test.ts`, `apps/web/src/lib/components/Inspector.test.ts`, `apps/web/src/lib/components/HelpOverlay.test.ts`, `apps/web/src/test/setup.ts`
- **Context**: Transitioning to Svelte 5 and Vitest requires explicit type narrowing for reactive objects and specific entry points for test matchers to be recognized by both the compiler and IDEs.

### [2026-05-18] - Map Rendering E2E Regression Test & Fixes

- **Summary**: Added an E2E regression test to validate that the star map and solar system map are rendered correctly and fixed a timing issue in Navigation component tests.
- **Changes**:
  - Created `apps/e2e-tests/test/specs/map-rendering.e2e.js` with tests for StarMap and SolarSystemMap.
  - Updated `apps/web/src/lib/components/SolarSystemMap.svelte` to expose `solarSystemDebug` for E2E verification.
  - Updated `apps/e2e-tests/wdio.conf.js` to use the correct workspace root target path for the Tauri binary.
  - Fixed `apps/web/src/lib/components/Navigation.test.ts` by adding `tick()` after timer advancement to handle Svelte 5 effect timing.
- **Files Affected**: `apps/e2e-tests/test/specs/map-rendering.e2e.js`, `apps/web/src/lib/components/SolarSystemMap.svelte`, `apps/e2e-tests/wdio.conf.js`, `apps/web/src/lib/components/Navigation.test.ts`
- **Context**: None.

### [2026-05-18] - Fix Empty Star Map Canvas Reactivity

- **Summary**: Fixed a bug where the star map canvas remained empty on startup due to improper reactivity in Svelte 5 components.
- **Changes**:
  - Declared `app` and `viewport` as reactive state using `$state` in `StarMap.svelte` and `SolarSystemMap.svelte`.
  - Added a reactive `$effect` in `SolarSystemMap.svelte` to handle re-rendering when the active system ID changes.
  - Cleaned up temporary diagnostic logs in `apps/web/src/lib/stores/clusterData.ts`.
- **Files Affected**: `apps/web/src/lib/components/StarMap.svelte`, `apps/web/src/lib/components/SolarSystemMap.svelte`, `apps/web/src/lib/stores/clusterData.ts`
- **Context**: Svelte 5 requires explicit `$state` declarations for variables used in effects to trigger re-runs correctly.

### [2026-05-18] - Fix WebDriverIO MCP Server Configuration

- **Summary**: Resolved performance, compatibility, and resource leakage issues in the WebDriverIO MCP server configuration.
- **Changes**:
  - Installed `@wdio/mcp` as a local devDependency to eliminate `npx` overhead.
  - Created `scripts/wdio-mcp-adapter.cjs` to provide `list_tools` compatibility and improve process management.
  - Updated `.junie/mcp/mcp.json` to use the local adapter instead of `npx @latest`.
  - Cleaned up orphaned browser processes from previous failed sessions.
- **Files Affected**: `.junie/mcp/mcp.json`, `package.json`, `scripts/wdio-mcp-adapter.cjs`.
- **Context**: The previous configuration used `npx @latest`, which was extremely slow and caused orphaned browser processes that consumed system resources.

### [2026-05-18] - Procedural Generation Native Library & Storage Refactor

- **Summary**: Switched desktop app to use native Rust library via Tauri commands instead of WASM for procedural generation.
- **Changes**:
  - Extracted procedural generation logic into a shared `procedural-gen` Rust library with feature-gated WASM support.
  - Implemented `generate_cluster`, `get_cluster`, and `compute_route` as native Tauri commands.
  - Updated `StorageProvider` to support both Tauri and Browser environments, using native commands for desktop.
  - Refactored frontend to use dynamic imports for WASM, ensuring it's not loaded in the desktop application.
  - Enhanced solar system generation logic for binary and trinary systems in the native library.
- **Files Affected**: `libs/procedural-gen/`, `apps/desktop/src/commands.rs`, `apps/web/src/lib/storage/`, `apps/web/src/lib/stores/clusterData.ts`, `Cargo.toml`.
- **Context**: Optimized desktop performance by leveraging native Rust execution while maintaining web compatibility through WASM.

### [2026-05-18] - Added AGPL-3.0 licensing to the project

- **Summary**: Added AGPL-3.0 licensing to the project.
- **Changes**:
  - Added LICENSE file with GNU Affero General Public License v3.0 text.
  - Updated package.json files (root, apps/web, apps/e2e-tests) to specify AGPL-3.0-only.
  - Updated apps/desktop/Cargo.toml to specify AGPL-3.0-only.
  - Added License section to README.md.
- **Files Affected**: LICENSE, package.json, apps/web/package.json, apps/e2e-tests/package.json, apps/desktop/Cargo.toml, README.md.
- **Context**: Transitioned from MIT (as previously stated in root package.json) to AGPL-3.0 to ensure copyleft for network server software.

### [2026-05-18] - Move E2E tests to apps/e2e-tests

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

### [2026-05-18] - Monorepo Restructure

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

### [2026-05-18] - Create generate-changelog skill

- **Summary**: Created a new Junie skill for generating changelog entries consistent with project guidelines.
- **Changes**:
  - Created `.junie/skills/generate-changelog/SKILL.md` containing documentation for the changelog workflow.
  - Defined the trigger, workflow, and expected format for agent-led changelog updates.
- **Files Affected**: `.junie/skills/generate-changelog/SKILL.md`
- **Context**: This skill ensures that all future agents follow the standardized changelog format defined in AGENTS.md.

### [2026-05-16] - Migrate to pnpm

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

### [2026-05-16] - Resolve UI Linting and Accessibility Issues

- **Summary**: Resolved multiple linting and accessibility issues across core UI components to improve code quality and reactivity.
- **Changes**:
  - Replaced plain `Map` with `SvelteMap` in `StarMap.svelte` to resolve Svelte 5 reactivity warnings.
  - Fixed missing keys in `{#each}` blocks within `HelpOverlay.svelte` and `Inspector.svelte`.
  - Removed unused variables and cleaned up dead code in `Navigation.svelte` and `StarMap.svelte`.
  - Enhanced ARIA roles and accessibility attributes in `Inspector.svelte` and `HelpOverlay.svelte`.
  - Verified all changes using `npm run lint`, `npm run check`, and unit tests.
- **Files Affected**: `src/lib/components/HelpOverlay.svelte`, `src/lib/components/Navigation.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/Inspector.svelte`.
- **Context**: None.

### [2026-05-16] - Improve Map Viewport UX

- **Summary**: Enhanced the star map and solar system map by ensuring content visibility, maintaining 60% viewport coverage, and implementing robust panning constraints.
- **Changes**:
  - Implemented initial fit logic for `StarMap` to ensure all stars are visible upon loading.
  - Replaced manual panning prevention with `viewport.clamp` in both `StarMap` and `SolarSystemMap`.
  - Updated `resizeHandler` in both map components to dynamically recalculate zoom and pan limits.
  - Exposed `window.starMapDebug` to allow automated verification of viewport state.
  - Added E2E tests to verify initial fit and zoom constraints for the Star Map.
- **Files Affected**: `src/lib/components/StarMap.svelte`, `src/lib/components/SolarSystemMap.svelte`, `e2e-tests/test/specs/zoom-ux.e2e.js`.
- **Context**: None.

### [2026-05-16] - Advanced Map Highlighting & UI/UX Refinement

- **Summary**: Implemented interactive highlighting for orbits and portals, and finalized overall UI/UX improvements.
- **Changes**:
  - Added interactive ring-hit-area orbits in `SolarSystemMap`.
  - Added interactive line-hit-area portals in `StarMap`.
  - Implemented bidirectional highlighting for hovered and selected entities and their orbits/portals.
  - Verified and refined Navigation, Search, Inspector, and Help overlay components.
  - Ensured comprehensive unit test coverage for all new UI components.
- **Files Affected**: `src/lib/components/SolarSystemMap.svelte`, `src/lib/components/StarMap.svelte`, `src/lib/components/Navigation.svelte`, `src/lib/components/Inspector.svelte`, `src/lib/components/HelpOverlay.svelte`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/lib/components/Navigation.test.ts`, `src/lib/components/Inspector.test.ts`, `src/lib/components/HelpOverlay.test.ts`.
- **Context**: None.

### [2026-05-16] - UI & UX Improvements

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
