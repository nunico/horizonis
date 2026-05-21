# Project State

## Architecture

- Monorepo: `apps/client` (SvelteKit), `apps/shell` (Tauri + Rust)
- State management: Svelte 5 runes
- Backend: [your backend summary]

## Active Decisions

- Standardize on `$lib` alias for all internal imports in `apps/client` to ensure consistent IDE and CLI type analysis (2026-05-19).

## Known Constraints

- Svelte 5 runes (`$derived`, `$state`) require careful handling of optional chaining for store values to avoid runtime `TypeError`.

## Current Focus

- Performance optimization and feature parity between web and desktop targets.
