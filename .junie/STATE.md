# Project State

## Architecture

- Monorepo: `apps/client` (SvelteKit), `apps/shell` (Tauri + Rust)
- State management: Svelte 5 runes
- Backend: [your backend summary]

## Active Decisions

- Standardize on `$lib` alias for all internal imports in `apps/client` to ensure consistent IDE and CLI type analysis (2026-05-19).
- Centralized PIXI.js and Viewport initialization in `$lib/pixi/setup.ts` to reduce boilerplate and ensure consistent rendering behavior across maps (2026-05-21).
- Extracted reusable spatial grid logic to `$lib/utils/spatial.ts` for consistent system clustering and culling (2026-05-21).
- Enforce PascalCase property consistency for all procedural-gen WASM outputs to match frontend types (2026-05-21).
- Use `fixed` positioning and `top-20` offset for UI components (Navigation, Inspector, Map Controls) to prevent viewport offsets and ensure clear visibility over the fixed navigation bar (2026-05-22).
- Strict type safety enforced across the application and E2E tests by eliminating `any` usage and removing ESLint silencers (2026-05-22).
- Set `StarMap` and `SolarSystemMap` to `absolute inset-0` to fill the viewport without affecting layout flow (2026-05-22).
- Allow users to manually rearrange solar systems in the Star Map via drag-and-drop; coordinates are persisted to the cluster store (2026-05-22).
- Pluggable map styles: appearance is decoupled from layout/interaction via the `MapStyle` contract in `$lib/styles/`. Styles are authored as JSON-serializable `StyleDefinition`s interpreted by `createDeclarativeStyle` (safe-sharing path); a hand-written `MapStyle` is the optional code escape-hatch. The two built-ins (`realistic`, `tactical`) both go through the declarative path — no privileged code. Components own positions, scaling, camera and the hover/selection redraw loop; styles only decide colors, shapes, label typography and screen-space overlays (e.g. CRT scanlines, drawn as scene-graph nodes rather than GL filters for WebGL/WebGPU parity) (2026-06-17).
- Star colors use the full OBAFGKM sequence from `docs/stellar_classifications.md` (was G/M/default) (2026-06-17).
- Map-style preferences (active style id + imported style JSON) persist via `localStorage` in `$lib/styles/preferences.ts`, intentionally separate from the cluster `StorageProvider`; `localStorage` works in both browser and Tauri webview, so no Rust commands are needed (2026-06-17).

## Known Constraints

- Svelte 5 runes (`$derived`, `$state`) require careful handling of optional chaining for store values to avoid runtime `TypeError`.

## Current Focus

- Performance optimization and feature parity between web and desktop targets.
