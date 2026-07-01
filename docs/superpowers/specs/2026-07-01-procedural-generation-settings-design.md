# Procedural generation settings UI

**Date:** 2026-07-01
**Status:** Approved (design)
**Scope:** `libs/procedural-gen` (Rust core + WASM binding), `apps/shell`
(Tauri commands + storage), `apps/client` (settings store, route, nav).

## Problem

Cluster generation (`generate_solar_system` / `generate_cluster` in
`libs/procedural-gen/src/generation.rs`) hardcodes every tunable: system
count, multi-star odds, planet counts, asteroid belt odds. Users have no way
to shape the kind of cluster they get beyond re-rolling the seed.

## Goals

- Let users configure, before regenerating: system count range, multi-star
  percentage, max planets/bodies per star, asteroid belt frequency, the
  binary/trinary split among multi-star systems, and whether multi-star
  systems can have system-level (circumbinary) planets.
- Persist the chosen settings across sessions, in both the Tauri desktop app
  and the browser build, using the existing per-mode storage abstraction.
- Reuse the existing regenerate flow (confirm dialog, undo snapshot, toast)
  once settings are saved.

## Non-goals

- No per-system overrides (settings apply to the whole cluster, one shot).
- No change to portal/connectivity generation (Delaunay + degree pruning
  stays as-is).
- No change to spectral class weighting, star naming, or body physical
  properties (radius/mass/density formulas).

## Context

Relevant code:

- `libs/procedural-gen/src/generation.rs` — `generate_cluster(seed)`,
  `generate_solar_system`, `generate_body`. Hardcoded constants of interest:
  - `rng.random_range(15..25)` — system count.
  - `rng.random_bool(0.2)` then `rng.random_bool(0.7)` — 20% chance
    multi-star, 70/30 binary/trinary split among those.
  - `rng.random_range(0..8)` — bodies per star.
  - `rng.random_bool(0.5)` — per-star asteroid belt.
  - `rng.random_bool(0.6)` — system-wide asteroid belt.
  - `rng.random_bool(0.3)` and `rng.random_range(0..4)` — lone outer body /
    circumbinary bodies for multi-star systems.
- `libs/procedural-gen/src/wasm.rs` — `#[wasm_bindgen] pub fn
  generate_cluster(seed: u64)`.
- `libs/procedural-gen/src/lib.rs` — re-exports.
- `apps/shell/src/commands.rs` — `generate_cluster` Tauri command, `AppState`
  cluster cache.
- `apps/shell/src/storage.rs` — `StorageManager` (save/load cluster JSON on
  disk).
- `apps/client/src/lib/storage/{index,tauri,browser}.ts` — `StorageProvider`
  interface and its two implementations.
- `apps/client/src/lib/stores/clusterData.ts` — `generateNewCluster(seed?)`.
- `apps/client/src/lib/components/Navigation.svelte` — regenerate button +
  `ConfirmDialog`; `StylePicker.svelte` is the popover-menu pattern reference.

## Design

### 1. Rust: `GenerationSettings`

New struct in `libs/procedural-gen/src/models.rs` (alongside the other
domain types), `Serialize`/`Deserialize`/`Clone`/`Debug`/`PartialEq`, with a
`Default` impl matching today's hardcoded behavior:

```rust
pub struct GenerationSettings {
    pub system_count_min: u32,       // default 15
    pub system_count_max: u32,       // default 25 (exclusive, matches today)
    pub multi_star_chance: f32,      // default 0.2   (0.0..=1.0)
    pub trinary_ratio: f32,          // default 0.3   (0.0..=1.0)
    pub max_bodies_per_star: u32,    // default 8     (exclusive upper bound)
    pub asteroid_belt_chance: f32,   // default 0.5   (0.0..=1.0)
    pub disallow_circumbinary_bodies: bool, // default false
}
```

Notes on consolidation:

- `asteroid_belt_chance` replaces **two** distinct hardcoded probabilities
  (per-star `0.5`, system-wide `0.6`) with one knob used for both rolls.
  Default `0.5` is a deliberate, documented behavior change for the
  system-wide roll (0.6 → 0.5); acceptable since this whole system is now
  user-tunable.
- `disallow_circumbinary_bodies` only affects the multi-star branch of
  "Circumbinary / System-wide bodies" generation (`generate_solar_system`);
  it does not touch the single-star "lone outer body" roll.

`generate_cluster(seed: u64) -> StarCluster` becomes
`generate_cluster(seed: u64, settings: &GenerationSettings) -> StarCluster`.
`generate_solar_system` and the per-star loop take `settings` (or the
relevant fields) instead of literals. Validation of `system_count_min <=
system_count_max` and non-negative/0..=1 ranges happens at the UI layer
(§4); the Rust core clamps defensively (e.g. `max(system_count_min, 1)`,
`min.min(max)` swap) so it can never panic on a malformed struct, but does
not error — it degrades gracefully.

### 2. WASM + Tauri plumbing

- `libs/procedural-gen/src/wasm.rs`: `generate_cluster(seed: u64, settings:
  JsValue) -> Result<JsValue, JsValue>`, deserializing `settings` the same
  way `compute_route` deserializes its `JsValue` args.
- `apps/shell/src/commands.rs`: `generate_cluster` command gains a
  `settings: Option<GenerationSettings>` parameter (falls back to
  `GenerationSettings::default()` when `None`, mirroring the existing `seed`
  handling).
- New Tauri commands `get_generation_settings` / `save_generation_settings`,
  parallel to `get_cluster`/`save_cluster`, backed by a new method pair on
  `StorageManager` (`apps/shell/src/storage.rs`) that reads/writes a sibling
  `generation_settings.json` file. Missing file ⇒ return `GenerationSettings::default()`
  (not an error), matching "first run" ergonomics.

### 3. Frontend storage + store

- `StorageProvider` (`apps/client/src/lib/storage/index.ts`) gains:
  `getGenerationSettings(): Promise<GenerationSettings>` and
  `saveGenerationSettings(settings: GenerationSettings): Promise<void>`.
- `TauriStorage` calls the two new commands.
- `BrowserStorage` uses a new localStorage key
  (`horizonis_generation_settings`); `getGenerationSettings` returns
  `GenerationSettings` defaults (imported from a shared TS type/const, not
  re-implemented) when the key is absent or fails to parse.
- `TauriStorage`/`BrowserStorage`'s existing `generateCluster(seed?)` gains a
  second parameter: `generateCluster(seed?: bigint, settings?:
  GenerationSettings)`, passed through to the Rust command / WASM call.
- New `apps/client/src/lib/stores/generationSettings.ts`:
  - `generationSettings: Writable<GenerationSettings>`, seeded with defaults.
  - `loadGenerationSettings()` — called once during app init (alongside
    `initWasm`/`loadCluster`), populates the store from storage.
  - `saveGenerationSettings(settings)` — persists via the storage provider
    and updates the store.
  - `defaultGenerationSettings: GenerationSettings` constant, the single
    source of truth for defaults on the TS side (values mirror the Rust
    `Default` impl one-to-one; kept in sync manually, called out in a code
    comment on both sides since there's no shared codegen).
- `clusterData.ts`'s `generateNewCluster(seed?)` reads the current value of
  `generationSettings` (via `get(generationSettings)`) and passes it to
  `provider.generateCluster(seed, settings)`.

### 4. UI: `/settings` route

New `apps/client/src/routes/settings/+page.svelte`:

- Bound to a local `$state` copy of `$generationSettings` (so edits are
  staged, not live-applied) plus a `errors: string[]` derived from
  validation:
  - `system_count_min >= 1`
  - `system_count_min <= system_count_max`
  - `max_bodies_per_star >= 0`
  - the three chance fields are inputs styled as % (0–100), stored/sent as
    0.0–1.0.
- Fields:
  - "Systems in cluster" — two number inputs (min/max), or a dual-handle
    range — min viable: two `<input type="number">` side by side.
  - "Multi-star systems" — percent slider/number (`multi_star_chance`).
  - "Trinary vs. binary" — percent slider/number (`trinary_ratio`), labeled
    "of multi-star systems, % that are trinary" — only meaningfully affects
    output when `multi_star_chance > 0`, but stays enabled/editable
    regardless (no dependent-field disabling, to keep the form simple).
  - "Max planets per star" — number input (`max_bodies_per_star`).
  - "Asteroid belt frequency" — percent slider/number
    (`asteroid_belt_chance`).
  - "Allow planets around multi-star systems as a whole" — checkbox, inverse
    of `disallow_circumbinary_bodies`.
- Actions:
  - **Save & Generate New Cluster** — disabled while `errors.length > 0`;
    calls `saveGenerationSettings(local)`, then the same regenerate
    sequence `Navigation.svelte` already uses (confirm dialog → `nativeConfirm`
    → `generateNewCluster()` → `recordSnapshot` → toast). To avoid
    duplicating that logic, extract the existing `confirmRegenerate` /
    `requestRegenerate` pair out of `Navigation.svelte` into a shared helper
    (e.g. `apps/client/src/lib/actions/regenerate.ts` exporting
    `requestRegenerate({ onDone })`), used by both `Navigation.svelte` and
    the new settings page.
  - **Reset to Defaults** — resets the local staged copy to
    `defaultGenerationSettings` (does not save until "Save & Generate" is
    pressed).
  - **Cancel/Back** — navigates back without saving (standard SvelteKit
    link), local edits discarded.
- `Navigation.svelte` gains a `Settings` icon (lucide-svelte) button next to
  `StylePicker`, navigating to `/settings` (`goto('/settings')`).

### 5. Data flow summary

```
Settings page (staged $state)
  → saveGenerationSettings() → generationSettings store + storage (persisted)
  → requestRegenerate() → generateNewCluster()
      → provider.generateCluster(seed, get(generationSettings))
          → Tauri: invoke('generate_cluster', { seed, settings })
              → procedural_gen::generate_cluster(seed, &settings)
          → Browser: generate_cluster(seed, settings) [wasm]
              → procedural_gen::generate_cluster(seed, &settings)
  → cluster store updated → toast/undo snapshot (unchanged)
```

## Testing (TDD)

**Rust** (`libs/procedural-gen/src/generation.rs` test module):

- `GenerationSettings::default()` reproduces current hardcoded behavior
  (existing tests updated to pass `&GenerationSettings::default()`).
- System count respects `[system_count_min, system_count_max)` across many
  seeds for a non-default range.
- `max_bodies_per_star` — no star ever exceeds it (property test).
- `asteroid_belt_chance = 0.0` ⇒ no orbital regions anywhere in the cluster;
  `1.0` ⇒ every eligible star/system gets one (bounded by `stable_limit`
  feasibility, same as the existing "every star has a planet or belt"
  guarantee from the prior change).
- `multi_star_chance = 0.0` ⇒ zero multi-star systems across many seeds;
  `1.0` ⇒ every system is multi-star.
- `trinary_ratio = 0.0` ⇒ multi-star systems are never 3 stars; `1.0` ⇒
  always 3 (when `multi_star_chance > 0`).
- `disallow_circumbinary_bodies = true` ⇒ multi-star systems have empty
  `orbital_bodies`.
- Defensive clamping: `system_count_min > system_count_max` doesn't panic
  (property test with `proptest`).

**Frontend** (Vitest):

- `generationSettings.ts` store: load falls back to defaults on
  missing/corrupt storage; save round-trips; `loadGenerationSettings`
  populates the writable.
- `TauriStorage`/`BrowserStorage`: new methods call the right
  command/localStorage key (mirroring existing `clusterData.test.ts`
  patterns).
- Settings page component: renders current values; validation blocks save
  on invalid range; "Reset to Defaults" restores defaults without saving;
  "Save & Generate" triggers save + regenerate flow (mock the shared
  regenerate helper).
- `Navigation.test.ts` updated for the new settings nav icon/link.
- Shared regenerate helper: extracted logic behaves identically to today's
  inline `Navigation.svelte` implementation (existing regenerate-flow test
  coverage continues to pass against the extracted version).

## Rollout

Single PR. No breaking change to existing saved clusters (settings file is
new and independent; absence ⇒ defaults). `cargo test`, `pnpm test`, `pnpm
nx run-many --targets=check`, and `pnpm lint` all green before merge.
