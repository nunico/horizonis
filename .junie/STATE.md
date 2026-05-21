# Project State

## Architecture

- Monorepo: `apps/client` (SvelteKit), `apps/shell` (Tauri + Rust)
- State management: Svelte 5 runes
- Backend: [your backend summary]

## Active Decisions

- Standardize on `$lib` alias for all internal imports in `apps/client` to ensure consistent IDE and CLI type analysis (2026-05-19).
- Centralized PIXI.js and Viewport initialization in `$lib/pixi/setup.ts` to reduce boilerplate and ensure consistent rendering behavior across maps (2026-05-21).
- Extracted reusable spatial grid logic to `$lib/utils/spatial.ts` for consistent system clustering and culling (2026-05-21).

## Known Constraints

- Svelte 5 runes (`$derived`, `$state`) require careful handling of optional chaining for store values to avoid runtime `TypeError`.

## Current Focus

- Performance optimization and feature parity between web and desktop targets.
