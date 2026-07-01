# Procedural Generation Settings UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users configure cluster-generation parameters (system count range, multi-star odds, planets per star, asteroid belt frequency, binary/trinary split, circumbinary bodies toggle) from a new `/settings` page, persisted across sessions, and reused by the existing regenerate flow.

**Architecture:** A new `GenerationSettings` struct in the Rust `procedural-gen` crate replaces hardcoded constants in `generate_cluster`/`generate_solar_system`. It threads through the WASM binding and a new pair of Tauri commands, backed by a generalized `StorageManager` that persists it as `generation_settings.json`. The SvelteKit frontend gets a matching TS type, a `generationSettings` store, and a `/settings` route that stages edits locally, saves them, then reuses the existing (now-extracted) regenerate flow.

**Tech Stack:** Rust (`procedural-gen` lib, `horizonis-shell` Tauri app), TypeScript/Svelte 5 (`horizonis-client`), Vitest, `proptest`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-01-procedural-generation-settings-design.md` — every field, default, and behavior below must match it exactly.
- `GenerationSettings` fields and Rust-side defaults (from spec §1):
  `system_count_min: u32 = 15`, `system_count_max: u32 = 25`,
  `multi_star_chance: f32 = 0.2`, `trinary_ratio: f32 = 0.3`,
  `max_bodies_per_star: u32 = 8`, `asteroid_belt_chance: f32 = 0.5`,
  `disallow_circumbinary_bodies: bool = false`.
- `asteroid_belt_chance` replaces **both** the per-star `0.5` and system-wide
  `0.6` hardcoded rolls with one knob (spec §1 "Notes on consolidation").
- All Rust structs in this codebase use `#[serde(rename_all = "PascalCase")]`
  (see `libs/procedural-gen/src/models.rs`) — `GenerationSettings` must match,
  and the TS-side `GenerationSettings` interface uses the same PascalCase
  field names (see `apps/client/src/lib/types/stellar.ts` for the existing
  convention).
- Frontend style: tabs, single quotes, no trailing commas, 100-char print
  width (`.prettierrc`). Match existing file conventions exactly.
- Rust: no `.unwrap()`/`.expect()` outside tests/`main`; treat clippy warnings
  as errors; `cargo fmt` clean.
- Run `cargo test` (in `libs/procedural-gen` and `apps/shell`) and
  `vitest run` (in `apps/client`) after every task that touches that
  project. Final task runs the full `pnpm run verify` (check+lint+test for
  every project).
- Never edit `CHANGELOG.md` directly — that's out of scope for this plan
  (no changelog-writer subagent is available in this environment; skip it).

---

### Task 1: `GenerationSettings` model in the Rust core

**Files:**
- Modify: `libs/procedural-gen/src/models.rs`

**Interfaces:**
- Produces: `pub struct GenerationSettings { system_count_min: u32, system_count_max: u32, multi_star_chance: f32, trinary_ratio: f32, max_bodies_per_star: u32, asteroid_belt_chance: f32, disallow_circumbinary_bodies: bool }`, `impl Default for GenerationSettings`, `impl GenerationSettings { pub fn sanitized(&self) -> Self }`. Task 2 consumes all three.

- [ ] **Step 1: Write the failing tests**

Append to the bottom of `libs/procedural-gen/src/models.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_generation_settings_matches_historical_hardcoded_behavior() {
        let settings = GenerationSettings::default();
        assert_eq!(settings.system_count_min, 15);
        assert_eq!(settings.system_count_max, 25);
        assert_eq!(settings.multi_star_chance, 0.2);
        assert_eq!(settings.trinary_ratio, 0.3);
        assert_eq!(settings.max_bodies_per_star, 8);
        assert_eq!(settings.asteroid_belt_chance, 0.5);
        assert!(!settings.disallow_circumbinary_bodies);
    }

    #[test]
    fn sanitized_clamps_out_of_range_values() {
        let settings = GenerationSettings {
            system_count_min: 0,
            system_count_max: 0,
            multi_star_chance: -1.0,
            trinary_ratio: 5.0,
            max_bodies_per_star: 0,
            asteroid_belt_chance: -0.5,
            disallow_circumbinary_bodies: true,
        };
        let sanitized = settings.sanitized();
        assert!(sanitized.system_count_min >= 1);
        assert!(sanitized.system_count_max > sanitized.system_count_min);
        assert_eq!(sanitized.multi_star_chance, 0.0);
        assert_eq!(sanitized.trinary_ratio, 1.0);
        assert_eq!(sanitized.max_bodies_per_star, 0);
        assert_eq!(sanitized.asteroid_belt_chance, 0.0);
        assert!(sanitized.disallow_circumbinary_bodies);
    }

    #[test]
    fn sanitized_leaves_valid_settings_unchanged() {
        let settings = GenerationSettings::default();
        assert_eq!(settings.sanitized(), settings);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail to compile**

Run: `cd libs/procedural-gen && cargo test models::`
Expected: FAIL — `GenerationSettings` is not defined (compile error).

- [ ] **Step 3: Implement `GenerationSettings`**

Add this above the `#[cfg(test)]` block in `libs/procedural-gen/src/models.rs` (after the existing `Portal` struct):

```rust
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct GenerationSettings {
    pub system_count_min: u32,
    pub system_count_max: u32,
    pub multi_star_chance: f32,
    pub trinary_ratio: f32,
    pub max_bodies_per_star: u32,
    pub asteroid_belt_chance: f32,
    pub disallow_circumbinary_bodies: bool,
}

impl Default for GenerationSettings {
    fn default() -> Self {
        GenerationSettings {
            system_count_min: 15,
            system_count_max: 25,
            multi_star_chance: 0.2,
            trinary_ratio: 0.3,
            max_bodies_per_star: 8,
            asteroid_belt_chance: 0.5,
            disallow_circumbinary_bodies: false,
        }
    }
}

impl GenerationSettings {
    /// Clamp to valid ranges so generation can never panic on a malformed or
    /// user-supplied struct (e.g. an empty `system_count_min..system_count_max`
    /// range would panic `Rng::random_range`).
    pub fn sanitized(&self) -> Self {
        let system_count_min = self.system_count_min.max(1);
        let system_count_max = self.system_count_max.max(system_count_min + 1);
        GenerationSettings {
            system_count_min,
            system_count_max,
            multi_star_chance: self.multi_star_chance.clamp(0.0, 1.0),
            trinary_ratio: self.trinary_ratio.clamp(0.0, 1.0),
            max_bodies_per_star: self.max_bodies_per_star,
            asteroid_belt_chance: self.asteroid_belt_chance.clamp(0.0, 1.0),
            disallow_circumbinary_bodies: self.disallow_circumbinary_bodies,
        }
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd libs/procedural-gen && cargo test models::`
Expected: `test result: ok. 3 passed; 0 failed`

- [ ] **Step 5: Format, lint, commit**

Run: `cd libs/procedural-gen && cargo fmt && cargo clippy --all-targets`
Expected: no warnings.

```bash
git add libs/procedural-gen/src/models.rs
git commit -m "$(cat <<'EOF'
Add GenerationSettings model for configurable cluster generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Thread `GenerationSettings` through cluster/system generation

**Files:**
- Modify: `libs/procedural-gen/src/generation.rs`

**Interfaces:**
- Consumes: `crate::models::GenerationSettings` (Task 1), `.sanitized()`.
- Produces: `pub fn generate_cluster(seed: u64, settings: &GenerationSettings) -> StarCluster` (replaces the old `generate_cluster(seed: u64)`). Task 3 (wasm.rs), Task 4 (`apps/shell/src/storage.rs`), Task 5 (`apps/shell/src/commands.rs`) all call this new signature.

- [ ] **Step 1: Update the top-of-file import**

In `libs/procedural-gen/src/generation.rs`, change line 1:

```rust
use crate::models::{BodyType, OrbitalBody, OrbitalRegion, Portal, SolarSystem, Star, StarCluster};
```

to:

```rust
use crate::models::{
    BodyType, GenerationSettings, OrbitalBody, OrbitalRegion, Portal, SolarSystem, Star,
    StarCluster,
};
```

- [ ] **Step 2: Write the failing tests (new behavior)**

Insert these tests into the `#[cfg(test)] mod tests` block in `libs/procedural-gen/src/generation.rs`, just above the closing `}` of the module (after `test_generate_cluster_multistar_systems_use_main_star_relative_positions`):

```rust
    #[test]
    fn test_generate_cluster_respects_custom_system_count_range() {
        let settings = GenerationSettings {
            system_count_min: 3,
            system_count_max: 6,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            assert!(
                (3..6).contains(&cluster.systems.len()),
                "system count {} outside configured range",
                cluster.systems.len()
            );
        }
    }

    #[test]
    fn test_generate_cluster_max_bodies_per_star_is_never_exceeded() {
        let settings = GenerationSettings {
            max_bodies_per_star: 3,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                for star in &system.stars {
                    assert!(
                        star.satellites.len() <= 3,
                        "star {} exceeded max_bodies_per_star",
                        star.name
                    );
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_zero_max_bodies_per_star_yields_no_satellites() {
        let settings = GenerationSettings {
            max_bodies_per_star: 0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                for star in &system.stars {
                    assert!(star.satellites.is_empty());
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_zero_asteroid_belt_chance_yields_no_regions() {
        let settings = GenerationSettings {
            asteroid_belt_chance: 0.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert!(system.orbital_regions.is_empty());
                for star in &system.stars {
                    assert!(star.orbital_regions.is_empty());
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_full_asteroid_belt_chance_yields_regions_where_feasible() {
        let settings = GenerationSettings {
            asteroid_belt_chance: 1.0,
            ..GenerationSettings::default()
        };
        let mut found_system_region = false;
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                if !system.orbital_regions.is_empty() {
                    found_system_region = true;
                }
            }
        }
        assert!(
            found_system_region,
            "expected at least one system-wide asteroid belt"
        );
    }

    #[test]
    fn test_generate_cluster_no_bodies_and_no_belts_does_not_panic() {
        let settings = GenerationSettings {
            max_bodies_per_star: 0,
            asteroid_belt_chance: 0.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..50 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                for star in &system.stars {
                    assert!(star.satellites.is_empty());
                    assert!(star.orbital_regions.is_empty());
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_zero_multi_star_chance_yields_single_star_systems() {
        let settings = GenerationSettings {
            multi_star_chance: 0.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert_eq!(system.stars.len(), 1);
            }
        }
    }

    #[test]
    fn test_generate_cluster_full_multi_star_chance_yields_only_multi_star_systems() {
        let settings = GenerationSettings {
            multi_star_chance: 1.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert!(system.stars.len() >= 2);
            }
        }
    }

    #[test]
    fn test_generate_cluster_zero_trinary_ratio_yields_only_binaries() {
        let settings = GenerationSettings {
            multi_star_chance: 1.0,
            trinary_ratio: 0.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert_eq!(system.stars.len(), 2);
            }
        }
    }

    #[test]
    fn test_generate_cluster_full_trinary_ratio_yields_only_trinaries() {
        let settings = GenerationSettings {
            multi_star_chance: 1.0,
            trinary_ratio: 1.0,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert_eq!(system.stars.len(), 3);
            }
        }
    }

    #[test]
    fn test_generate_cluster_disallow_circumbinary_bodies_empties_system_wide_bodies() {
        let settings = GenerationSettings {
            multi_star_chance: 1.0,
            disallow_circumbinary_bodies: true,
            ..GenerationSettings::default()
        };
        for seed in 0_u64..200 {
            let cluster = generate_cluster(seed, &settings);
            for system in &cluster.systems {
                assert!(system.stars.len() >= 2);
                assert!(system.orbital_bodies.is_empty());
            }
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(32))]

        #[test]
        fn test_generate_cluster_arbitrary_settings_never_panics(
            seed in any::<u64>(),
            system_count_min in 0u32..50,
            system_count_max in 0u32..50,
            multi_star_chance in -1.0f32..2.0,
            trinary_ratio in -1.0f32..2.0,
            max_bodies_per_star in 0u32..20,
            asteroid_belt_chance in -1.0f32..2.0,
            disallow_circumbinary_bodies in any::<bool>(),
        ) {
            let settings = GenerationSettings {
                system_count_min,
                system_count_max,
                multi_star_chance,
                trinary_ratio,
                max_bodies_per_star,
                asteroid_belt_chance,
                disallow_circumbinary_bodies,
            };
            let _ = generate_cluster(seed, &settings);
        }
    }
```

- [ ] **Step 3: Update every existing call site to the new signature**

In the same file, replace every occurrence of `generate_cluster(seed)` with
`generate_cluster(seed, &GenerationSettings::default())`. There are exactly
8 call sites, all inside `mod tests`:

- `test_generate_cluster_same_seed_returns_identical_results` (2 calls: `first`/`second`)
- `test_generate_cluster_seeded_structure_has_system_count_in_range`
- `test_generate_cluster_seeded_portals_keep_every_system_reachable`
- `test_generate_cluster_seeded_bodies_obey_physical_invariants`
- `test_generate_cluster_every_star_has_a_planet_or_asteroid_field`
- `test_generate_cluster_multistar_systems_have_individual_orbits_and_planetary_limits`
- `test_generate_cluster_multistar_systems_use_main_star_relative_positions`

For example, change:

```rust
        fn test_generate_cluster_same_seed_returns_identical_results(seed in any::<u64>()) {
            let first = generate_cluster(seed);
            let second = generate_cluster(seed);
```

to:

```rust
        fn test_generate_cluster_same_seed_returns_identical_results(seed in any::<u64>()) {
            let first = generate_cluster(seed, &GenerationSettings::default());
            let second = generate_cluster(seed, &GenerationSettings::default());
```

Apply the same `generate_cluster(seed)` → `generate_cluster(seed, &GenerationSettings::default())`
substitution at each of the other 6 call sites (one call each).

- [ ] **Step 4: Run the tests to verify they fail to compile**

Run: `cd libs/procedural-gen && cargo test generation::`
Expected: FAIL — `generate_cluster` takes 1 argument but 2 were supplied (compile error), since the implementation hasn't changed yet.

- [ ] **Step 5: Rewrite `generate_cluster` to accept and apply settings**

Replace lines 71–91 of `libs/procedural-gen/src/generation.rs`:

```rust
pub fn generate_cluster(seed: u64) -> StarCluster {
    let mut rng = StdRng::seed_from_u64(seed);
    let system_count = rng.random_range(15..25);
    let mut systems = Vec::with_capacity(system_count);

    // Generate system positions and basic data
    let mut names = SYSTEM_NAMES.to_vec();
    names.shuffle(&mut rng);

    for i in 0..system_count {
        let name = if i < names.len() {
            names[i].to_string()
        } else {
            format!("System {}", i)
        };

        let x = rng.random_range(-1500.0..1500.0);
        let y = rng.random_range(-1500.0..1500.0);

        systems.push(generate_solar_system(&mut rng, name, x, y));
    }
```

with:

```rust
pub fn generate_cluster(seed: u64, settings: &GenerationSettings) -> StarCluster {
    let settings = settings.sanitized();
    let mut rng = StdRng::seed_from_u64(seed);
    let system_count =
        rng.random_range(settings.system_count_min..settings.system_count_max) as usize;
    let mut systems = Vec::with_capacity(system_count);

    // Generate system positions and basic data
    let mut names = SYSTEM_NAMES.to_vec();
    names.shuffle(&mut rng);

    for i in 0..system_count {
        let name = if i < names.len() {
            names[i].to_string()
        } else {
            format!("System {}", i)
        };

        let x = rng.random_range(-1500.0..1500.0);
        let y = rng.random_range(-1500.0..1500.0);

        systems.push(generate_solar_system(&mut rng, name, x, y, &settings));
    }
```

- [ ] **Step 6: Update `generate_solar_system`'s signature and body**

Replace lines 206–219:

```rust
fn generate_solar_system(rng: &mut impl Rng, name: String, x: f32, y: f32) -> SolarSystem {
    let id = gen_uuid(rng);

    // Determine number of stars
    let num_stars = if rng.random_bool(0.2) {
        // 20% binary/trinary
        if rng.random_bool(0.7) {
            2
        } else {
            3
        }
    } else {
        1
    };
```

with:

```rust
fn generate_solar_system(
    rng: &mut impl Rng,
    name: String,
    x: f32,
    y: f32,
    settings: &GenerationSettings,
) -> SolarSystem {
    let id = gen_uuid(rng);

    // Determine number of stars
    let num_stars = if rng.random_bool(settings.multi_star_chance as f64) {
        if rng.random_bool((1.0 - settings.trinary_ratio) as f64) {
            2
        } else {
            3
        }
    } else {
        1
    };
```

Replace lines 295–306 (the per-star body-count roll):

```rust
        let num_bodies = rng.random_range(0..8);
        let initial_orbit = 0.3 * stars[i].mass_sol.sqrt() * rng.random_range(0.8..1.2);
        let mut current_orbit = initial_orbit;
        for j in 0..num_bodies {
            current_orbit *= rng.random_range(1.3..1.9);
            if current_orbit > stable_limit {
                break;
            }
            stars[i]
                .satellites
                .push(generate_body(rng, j, current_orbit));
        }
```

with:

```rust
        let num_bodies = if settings.max_bodies_per_star == 0 {
            0
        } else {
            rng.random_range(0..settings.max_bodies_per_star)
        };
        let initial_orbit = 0.3 * stars[i].mass_sol.sqrt() * rng.random_range(0.8..1.2);
        let mut current_orbit = initial_orbit;
        for j in 0..num_bodies {
            current_orbit *= rng.random_range(1.3..1.9);
            if current_orbit > stable_limit {
                break;
            }
            stars[i]
                .satellites
                .push(generate_body(rng, j as usize, current_orbit));
        }
```

Replace lines 308–348 (per-star belt roll + the "every star gets one" fallback):

```rust
        // Generate star-level regions
        if rng.random_bool(0.5) {
            let last_orbit = stars[i]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(current_orbit);
            let inner = last_orbit * rng.random_range(1.2..1.8);
            let outer = inner + rng.random_range(0.5..2.0);
            if outer < stable_limit {
                let star_name = stars[i].name.clone();
                stars[i].orbital_regions.push(OrbitalRegion {
                    name: format!("{} Asteroid Belt", star_name),
                    inner_radius_au: inner,
                    outer_radius_au: outer,
                    region_type: "Asteroid Belt".to_string(),
                });
            }
        }

        // Every star gets at least one planet or asteroid field, when the
        // stable region around it is large enough to hold one.
        if stars[i].satellites.is_empty() && stars[i].orbital_regions.is_empty() {
            if initial_orbit <= stable_limit {
                stars[i]
                    .satellites
                    .push(generate_body(rng, 0, initial_orbit));
            } else {
                let inner = stable_limit * rng.random_range(0.3..0.6);
                let outer = (inner + rng.random_range(0.1..0.3) * stable_limit).min(stable_limit);
                if outer > inner {
                    let star_name = stars[i].name.clone();
                    stars[i].orbital_regions.push(OrbitalRegion {
                        name: format!("{} Asteroid Belt", star_name),
                        inner_radius_au: inner,
                        outer_radius_au: outer,
                        region_type: "Asteroid Belt".to_string(),
                    });
                }
            }
        }
```

with:

```rust
        // Generate star-level regions
        if rng.random_bool(settings.asteroid_belt_chance as f64) {
            let last_orbit = stars[i]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(current_orbit);
            let inner = last_orbit * rng.random_range(1.2..1.8);
            let outer = inner + rng.random_range(0.5..2.0);
            if outer < stable_limit {
                let star_name = stars[i].name.clone();
                stars[i].orbital_regions.push(OrbitalRegion {
                    name: format!("{} Asteroid Belt", star_name),
                    inner_radius_au: inner,
                    outer_radius_au: outer,
                    region_type: "Asteroid Belt".to_string(),
                });
            }
        }

        // Every star gets at least one planet or asteroid field, but only
        // through mechanisms the caller has actually left enabled: a
        // max_bodies_per_star of 0 or an asteroid_belt_chance of 0.0 is an
        // explicit request for "none", so the fallback must not override it.
        if stars[i].satellites.is_empty() && stars[i].orbital_regions.is_empty() {
            let can_place_planet = settings.max_bodies_per_star > 0 && initial_orbit <= stable_limit;
            if can_place_planet {
                stars[i]
                    .satellites
                    .push(generate_body(rng, 0, initial_orbit));
            } else if settings.asteroid_belt_chance > 0.0 {
                let inner = stable_limit * rng.random_range(0.3..0.6);
                let outer = (inner + rng.random_range(0.1..0.3) * stable_limit).min(stable_limit);
                if outer > inner {
                    let star_name = stars[i].name.clone();
                    stars[i].orbital_regions.push(OrbitalRegion {
                        name: format!("{} Asteroid Belt", star_name),
                        inner_radius_au: inner,
                        outer_radius_au: outer,
                        region_type: "Asteroid Belt".to_string(),
                    });
                }
            }
        }
```

Replace lines 351–370 (circumbinary bodies):

```rust
    // Circumbinary / System-wide bodies
    let mut orbital_bodies = Vec::new();
    if num_stars > 1 {
        let mut current_orbit = stars.iter().map(|s| s.orbit_au.abs()).fold(0.0, f32::max) * 2.5;
        let num_circumbinary = rng.random_range(0..4);
        for i in 0..num_circumbinary {
            current_orbit *= rng.random_range(1.3..1.8);
            orbital_bodies.push(generate_body(rng, i, current_orbit));
        }
    } else {
        if rng.random_bool(0.3) {
            let last_planet_orbit = stars[0]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(1.0);
            let orbit = last_planet_orbit * rng.random_range(5.0..20.0);
            orbital_bodies.push(generate_body(rng, 10, orbit));
        }
    }
```

with:

```rust
    // Circumbinary / System-wide bodies
    let mut orbital_bodies = Vec::new();
    if num_stars > 1 {
        if !settings.disallow_circumbinary_bodies {
            let mut current_orbit =
                stars.iter().map(|s| s.orbit_au.abs()).fold(0.0, f32::max) * 2.5;
            let num_circumbinary = rng.random_range(0..4);
            for i in 0..num_circumbinary {
                current_orbit *= rng.random_range(1.3..1.8);
                orbital_bodies.push(generate_body(rng, i, current_orbit));
            }
        }
    } else {
        if rng.random_bool(0.3) {
            let last_planet_orbit = stars[0]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(1.0);
            let orbit = last_planet_orbit * rng.random_range(5.0..20.0);
            orbital_bodies.push(generate_body(rng, 10, orbit));
        }
    }
```

Replace line 374 (system-wide belt chance):

```rust
    if rng.random_bool(0.6) {
```

with:

```rust
    if rng.random_bool(settings.asteroid_belt_chance as f64) {
```

- [ ] **Step 7: Run all generation tests to verify they pass**

Run: `cd libs/procedural-gen && cargo test generation::`
Expected: `test result: ok.` with all prior tests plus the 13 new ones passing (0 failed).

- [ ] **Step 8: Format, lint, commit**

Run: `cd libs/procedural-gen && cargo fmt && cargo clippy --all-targets`
Expected: no warnings.

```bash
git add libs/procedural-gen/src/generation.rs
git commit -m "$(cat <<'EOF'
Thread GenerationSettings through cluster and system generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update the WASM binding

**Files:**
- Modify: `libs/procedural-gen/src/wasm.rs`

**Interfaces:**
- Consumes: `generation::generate_cluster(seed, &GenerationSettings)` (Task 2).
- Produces: `#[wasm_bindgen] pub fn generate_cluster(seed: u64, settings: JsValue) -> Result<JsValue, JsValue>`. Task 8/9's `BrowserStorage.generateCluster` (in `apps/client`) calls this via the generated JS glue as `generate_cluster(seed, settingsObject)`.

This crate's `wasm` feature isn't exercised by `cargo test` (it's built via
`wasm-pack`), so there's no Rust unit test here — correctness is verified by
the frontend `generationSettings.test.ts` in Task 6 exercising the mocked
`procedural-gen` module the same way, and manually via `pnpm nx wasm:build
procedural-gen` compiling cleanly.

- [ ] **Step 1: Update the binding**

Replace the whole file `libs/procedural-gen/src/wasm.rs`'s `generate_cluster` function:

```rust
use crate::generation;
use crate::models::StarCluster;
use uuid::Uuid;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn generate_cluster(seed: u64) -> Result<JsValue, JsValue> {
    let cluster = generation::generate_cluster(seed);
    serde_wasm_bindgen::to_value(&cluster).map_err(|e| JsValue::from_str(&e.to_string()))
}
```

with:

```rust
use crate::generation;
use crate::models::{GenerationSettings, StarCluster};
use uuid::Uuid;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn generate_cluster(seed: u64, settings: JsValue) -> Result<JsValue, JsValue> {
    let settings: GenerationSettings = serde_wasm_bindgen::from_value(settings)
        .map_err(|e| JsValue::from_str(&format!("Invalid settings: {}", e)))?;
    let cluster = generation::generate_cluster(seed, &settings);
    serde_wasm_bindgen::to_value(&cluster).map_err(|e| JsValue::from_str(&e.to_string()))
}
```

(The `use crate::routing;` line and `compute_route` function below it are
unchanged — only the imports line and `generate_cluster` function change.)

- [ ] **Step 2: Verify the crate builds with the `wasm` feature**

Run: `cd libs/procedural-gen && cargo build --features wasm`
Expected: builds with no errors.

- [ ] **Step 3: Format, lint, commit**

Run: `cd libs/procedural-gen && cargo fmt && cargo clippy --all-targets --features wasm`
Expected: no warnings.

```bash
git add libs/procedural-gen/src/wasm.rs
git commit -m "$(cat <<'EOF'
Accept GenerationSettings in the WASM generate_cluster binding

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Generalize `StorageManager` and persist `generation_settings.json`

**Files:**
- Modify: `apps/shell/src/storage.rs`

**Interfaces:**
- Consumes: `procedural_gen::{generate_cluster, GenerationSettings, StarCluster}` (Tasks 1–2).
- Produces: `StorageManager::load_settings(&self) -> Result<GenerationSettings, String>`,
  `StorageManager::save_settings(&self, settings: &GenerationSettings) -> Result<(), String>`.
  Task 5's `commands.rs` calls both.

- [ ] **Step 1: Write the failing tests**

Add to the `#[cfg(test)] mod tests` block at the bottom of `apps/shell/src/storage.rs` (after the existing `test_load_default`):

```rust
    #[test]
    fn test_load_settings_returns_defaults_when_missing() {
        let dir = tempdir().unwrap();
        let storage = StorageManager::from_path(dir.path().join("cluster.json"));

        let settings = storage.load_settings().unwrap();
        assert_eq!(settings, GenerationSettings::default());
    }

    #[test]
    fn test_save_and_load_settings_round_trips() {
        let dir = tempdir().unwrap();
        let storage = StorageManager::from_path(dir.path().join("cluster.json"));

        let settings = GenerationSettings {
            system_count_min: 5,
            system_count_max: 10,
            ..GenerationSettings::default()
        };
        storage.save_settings(&settings).unwrap();

        let loaded = storage.load_settings().unwrap();
        assert_eq!(loaded, settings);
    }
```

- [ ] **Step 2: Run the tests to verify they fail to compile**

Run: `cd apps/shell && cargo test storage::`
Expected: FAIL — no method `load_settings`/`save_settings` on `StorageManager` (compile error).

- [ ] **Step 3: Rewrite `storage.rs`**

Replace the entire non-test portion of `apps/shell/src/storage.rs` (everything above `#[cfg(test)]`):

```rust
use procedural_gen::{generate_cluster, GenerationSettings, StarCluster};
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub struct StorageManager {
    file_path: PathBuf,
    settings_file_path: PathBuf,
}

impl StorageManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;

        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        }

        let file_path = app_dir.join("cluster.json");
        let settings_file_path = app_dir.join("generation_settings.json");
        Ok(Self {
            file_path,
            settings_file_path,
        })
    }

    #[cfg(test)]
    pub fn from_path(file_path: PathBuf) -> Self {
        let settings_file_path = file_path.with_file_name("generation_settings.json");
        Self {
            file_path,
            settings_file_path,
        }
    }

    pub fn load(&self) -> Result<StarCluster, String> {
        if !self.file_path.exists() {
            let cluster = self.create_default_cluster();
            if let Err(e) = self.save(&cluster) {
                eprintln!("Failed to save default cluster: {}", e);
            }
            return Ok(cluster);
        }

        Self::load_json(&self.file_path)?.ok_or_else(|| "cluster file disappeared".to_string())
    }

    pub fn save(&self, cluster: &StarCluster) -> Result<(), String> {
        Self::save_json(&self.file_path, cluster)
    }

    pub fn load_settings(&self) -> Result<GenerationSettings, String> {
        Ok(Self::load_json(&self.settings_file_path)?.unwrap_or_default())
    }

    pub fn save_settings(&self, settings: &GenerationSettings) -> Result<(), String> {
        Self::save_json(&self.settings_file_path, settings)
    }

    fn load_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
        if !path.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content)
            .map(Some)
            .map_err(|e| e.to_string())
    }

    fn save_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
        let content = serde_json::to_string_pretty(value)
            .map_err(|e| format!("Failed to serialize {}: {}", path.display(), e))?;

        let temp_path = path.with_extension("json.tmp");
        fs::write(&temp_path, content).map_err(|e| format!("Failed to write temp file: {}", e))?;
        fs::rename(&temp_path, path).map_err(|e| format!("Failed to rename temp file: {}", e))
    }

    fn create_default_cluster(&self) -> StarCluster {
        generate_cluster(42, &GenerationSettings::default()) // Use fixed seed for default cluster
    }
}
```

Leave `#[cfg(test)] mod tests { use super::*; use tempfile::tempdir; ... }` and its
existing two tests (`test_save_load`, `test_load_default`) exactly as they are —
they call `storage.create_default_cluster()` and `storage.load()`, whose
signatures are unchanged.

- [ ] **Step 4: Run all storage tests to verify they pass**

Run: `cd apps/shell && cargo test storage::`
Expected: `test result: ok. 4 passed; 0 failed`

- [ ] **Step 5: Format, lint, commit**

Run: `cd apps/shell && cargo fmt && cargo clippy --all-targets`
Expected: no warnings.

```bash
git add apps/shell/src/storage.rs
git commit -m "$(cat <<'EOF'
Persist GenerationSettings alongside the cluster in StorageManager

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: New Tauri commands + update `generate_cluster` command

**Files:**
- Modify: `apps/shell/src/commands.rs`
- Modify: `apps/shell/src/lib.rs`

**Interfaces:**
- Consumes: `StorageManager::load_settings`/`save_settings` (Task 4), `procedural_gen::{GenerationSettings, generate_cluster}` (Tasks 1–2).
- Produces: Tauri commands `get_generation_settings`, `save_generation_settings`, and an updated `generate_cluster(app_handle, state, seed: Option<u64>, settings: Option<GenerationSettings>)`. Task 6's `TauriStorage` (in `apps/client`) invokes all three by name.

This module has no existing `#[cfg(test)]` block (Tauri commands here are
integration-tested indirectly through `StorageManager`, which Task 4 already
covers) — no new Rust tests are added in this task; correctness is verified
by compilation plus the frontend's `generationSettings.test.ts` (Task 6)
exercising the equivalent `invoke(...)` call shapes.

- [ ] **Step 1: Update `commands.rs`**

Replace the top of `apps/shell/src/commands.rs`:

```rust
use crate::storage::StorageManager;
use crate::AppState;
use procedural_gen::{compute_route, SolarSystem, StarCluster};
use tauri::{AppHandle, State};
use uuid::Uuid;
```

with:

```rust
use crate::storage::StorageManager;
use crate::AppState;
use procedural_gen::{compute_route, GenerationSettings, SolarSystem, StarCluster};
use tauri::{AppHandle, State};
use uuid::Uuid;
```

Replace the `generate_cluster` command:

```rust
#[tauri::command]
pub fn generate_cluster(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    seed: Option<u64>,
) -> Result<StarCluster, String> {
    let seed = seed.unwrap_or_else(rand::random::<u64>);
    let cluster = procedural_gen::generate_cluster(seed);

    // Save to disk and update cache
    save_cluster(app_handle, state, cluster.clone())?;

    Ok(cluster)
}
```

with:

```rust
#[tauri::command]
pub fn generate_cluster(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    seed: Option<u64>,
    settings: Option<GenerationSettings>,
) -> Result<StarCluster, String> {
    let seed = seed.unwrap_or_else(rand::random::<u64>);
    let settings = settings.unwrap_or_default();
    let cluster = procedural_gen::generate_cluster(seed, &settings);

    // Save to disk and update cache
    save_cluster(app_handle, state, cluster.clone())?;

    Ok(cluster)
}

#[tauri::command]
pub fn get_generation_settings(app_handle: AppHandle) -> Result<GenerationSettings, String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.load_settings()
}

#[tauri::command]
pub fn save_generation_settings(
    app_handle: AppHandle,
    settings: GenerationSettings,
) -> Result<(), String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.save_settings(&settings)
}
```

- [ ] **Step 2: Register the new commands**

In `apps/shell/src/lib.rs`, replace:

```rust
        .invoke_handler(tauri::generate_handler![
            commands::get_cluster,
            commands::get_system,
            commands::save_cluster,
            commands::generate_cluster,
            commands::find_portal_route
        ])
```

with:

```rust
        .invoke_handler(tauri::generate_handler![
            commands::get_cluster,
            commands::get_system,
            commands::save_cluster,
            commands::generate_cluster,
            commands::find_portal_route,
            commands::get_generation_settings,
            commands::save_generation_settings
        ])
```

- [ ] **Step 3: Verify the crate builds and all tests pass**

Run: `cd apps/shell && cargo test`
Expected: `test result: ok.` (all existing `storage::` tests still pass; no
new tests in this task, so no new lines here — the point is confirming the
command signature changes compile against `AppState`/`StorageManager`).

- [ ] **Step 4: Format, lint, commit**

Run: `cd apps/shell && cargo fmt && cargo clippy --all-targets`
Expected: no warnings.

```bash
git add apps/shell/src/commands.rs apps/shell/src/lib.rs
git commit -m "$(cat <<'EOF'
Add get/save_generation_settings Tauri commands

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Frontend storage layer + `generationSettings` store

**Files:**
- Create: `apps/client/src/lib/types/generationSettings.ts`
- Create: `apps/client/src/lib/storage/provider.ts`
- Create: `apps/client/src/lib/stores/generationSettings.ts`
- Create: `apps/client/src/lib/stores/generationSettings.test.ts`
- Modify: `apps/client/src/lib/storage/index.ts`
- Modify: `apps/client/src/lib/storage/tauri.ts`
- Modify: `apps/client/src/lib/storage/browser.ts`
- Modify: `apps/client/src/lib/stores/clusterData.ts`
- Modify: `apps/client/src/lib/stores/clusterData.test.ts`

**Interfaces:**
- Consumes: Tauri commands `get_generation_settings`/`save_generation_settings`/`generate_cluster` (Task 5); WASM `generate_cluster(seed, settings)` (Task 3).
- Produces: `GenerationSettings` TS interface + `defaultGenerationSettings` const;
  `getStorageProvider(): Promise<StorageProvider>` and `_resetStorageProvider(): void`
  (used by both `clusterData.ts` and `generationSettings.ts`); store
  `generationSettings: Writable<GenerationSettings>`,
  `loadGenerationSettings(): Promise<GenerationSettings>`,
  `saveGenerationSettings(settings): Promise<void>`. Task 7 (regenerate flow)
  and Task 8 (settings page) both consume `generationSettings` and the two
  functions.

- [ ] **Step 1: Add the TS type + default**

Create `apps/client/src/lib/types/generationSettings.ts`:

```ts
export interface GenerationSettings {
	SystemCountMin: number;
	SystemCountMax: number;
	MultiStarChance: number;
	TrinaryRatio: number;
	MaxBodiesPerStar: number;
	AsteroidBeltChance: number;
	DisallowCircumbinaryBodies: boolean;
}

/**
 * Mirrors `GenerationSettings::default()` in
 * `libs/procedural-gen/src/models.rs` field-for-field. Keep both in sync
 * manually if either changes.
 */
export const defaultGenerationSettings: GenerationSettings = {
	SystemCountMin: 15,
	SystemCountMax: 25,
	MultiStarChance: 0.2,
	TrinaryRatio: 0.3,
	MaxBodiesPerStar: 8,
	AsteroidBeltChance: 0.5,
	DisallowCircumbinaryBodies: false
};
```

- [ ] **Step 2: Write the failing tests for the new store and the updated call shapes**

Create `apps/client/src/lib/stores/generationSettings.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	generationSettings,
	loadGenerationSettings,
	saveGenerationSettings
} from './generationSettings';
import { _resetStorageProvider } from '$lib/storage/provider';
import { defaultGenerationSettings } from '$lib/types/generationSettings';
import { clearToasts } from './toast';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('generationSettings store', () => {
	beforeEach(() => {
		generationSettings.set(defaultGenerationSettings);
		_resetStorageProvider();
		clearToasts();
		vi.clearAllMocks();
		// @ts-expect-error - Mocking storage
		delete window.__TAURI_INTERNALS__;
		localStorage.clear();
	});

	it('falls back to defaults when browser storage is empty', async () => {
		const settings = await loadGenerationSettings();

		expect(settings).toEqual(defaultGenerationSettings);
		expect(get(generationSettings)).toEqual(defaultGenerationSettings);
	});

	it('falls back to defaults when browser storage is corrupt', async () => {
		localStorage.setItem('horizonis_generation_settings', 'not json');

		const settings = await loadGenerationSettings();

		expect(settings).toEqual(defaultGenerationSettings);
	});

	it('loads previously saved settings from browser storage', async () => {
		const saved = { ...defaultGenerationSettings, SystemCountMin: 5, SystemCountMax: 10 };
		localStorage.setItem('horizonis_generation_settings', JSON.stringify(saved));

		const settings = await loadGenerationSettings();

		expect(settings).toEqual(saved);
	});

	it('saves settings to browser storage and updates the store', async () => {
		const updated = { ...defaultGenerationSettings, MultiStarChance: 0.5 };

		await saveGenerationSettings(updated);

		expect(get(generationSettings)).toEqual(updated);
		expect(JSON.parse(localStorage.getItem('horizonis_generation_settings')!)).toEqual(updated);
	});

	it('uses TauriStorage when __TAURI_INTERNALS__ is present', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		// @ts-expect-error - Mocking Tauri global
		window.__TAURI_INTERNALS__ = {};
		vi.mocked(invoke).mockResolvedValueOnce(defaultGenerationSettings);

		const settings = await loadGenerationSettings();

		expect(invoke).toHaveBeenCalledWith('get_generation_settings');
		expect(settings).toEqual(defaultGenerationSettings);
	});

	it('saves via TauriStorage when __TAURI_INTERNALS__ is present', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		// @ts-expect-error - Mocking Tauri global
		window.__TAURI_INTERNALS__ = {};
		const updated = { ...defaultGenerationSettings, TrinaryRatio: 0.5 };

		await saveGenerationSettings(updated);

		expect(invoke).toHaveBeenCalledWith('save_generation_settings', { settings: updated });
	});
});
```

Now update the two assertions in `apps/client/src/lib/stores/clusterData.test.ts`
that hard-code the old `generateCluster` call shape. Change:

```ts
		expect(invoke).toHaveBeenCalledWith('generate_cluster', { seed: null });
```

to:

```ts
		expect(invoke).toHaveBeenCalledWith('generate_cluster', {
			seed: null,
			settings: defaultGenerationSettings
		});
```

and change:

```ts
		expect(generate_cluster).toHaveBeenCalledWith(seed);
```

to:

```ts
		expect(generate_cluster).toHaveBeenCalledWith(seed, defaultGenerationSettings);
```

Add the import at the top of `clusterData.test.ts`:

```ts
import { defaultGenerationSettings } from '$lib/types/generationSettings';
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/client && npx vitest run src/lib/stores/generationSettings.test.ts src/lib/stores/clusterData.test.ts`
Expected: FAIL — `./generationSettings` and `$lib/storage/provider` don't
exist yet; the two updated `clusterData.test.ts` assertions fail against the
current (unchanged) call shape.

- [ ] **Step 4: Extend the storage interface and both implementations**

Replace `apps/client/src/lib/storage/index.ts`:

```ts
import type { StarCluster } from '$lib/types/stellar';

export interface StorageProvider {
	getCluster(): Promise<StarCluster>;
	saveCluster(cluster: StarCluster): Promise<void>;
	generateCluster(seed?: bigint): Promise<StarCluster>;
	computeRoute(startId: string, endId: string): Promise<string[]>;
}
```

with:

```ts
import type { StarCluster } from '$lib/types/stellar';
import type { GenerationSettings } from '$lib/types/generationSettings';

export interface StorageProvider {
	getCluster(): Promise<StarCluster>;
	saveCluster(cluster: StarCluster): Promise<void>;
	generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster>;
	computeRoute(startId: string, endId: string): Promise<string[]>;
	getGenerationSettings(): Promise<GenerationSettings>;
	saveGenerationSettings(settings: GenerationSettings): Promise<void>;
}
```

Replace `apps/client/src/lib/storage/tauri.ts` entirely:

```ts
import type { StarCluster } from '$lib/types/stellar';
import type { StorageProvider } from '$lib/storage';
import type { GenerationSettings } from '$lib/types/generationSettings';

export class TauriStorage implements StorageProvider {
	async getCluster(): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<StarCluster>('get_cluster');
	}

	async saveCluster(cluster: StarCluster): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('save_cluster', { cluster });
	}

	async generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		// Seed can be null, Tauri will handle it
		return await invoke<StarCluster>('generate_cluster', {
			seed: seed ? Number(seed) : null,
			settings: settings ?? null
		});
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<string[]>('find_portal_route', { startId, endId });
	}

	async getGenerationSettings(): Promise<GenerationSettings> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<GenerationSettings>('get_generation_settings');
	}

	async saveGenerationSettings(settings: GenerationSettings): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('save_generation_settings', { settings });
	}
}
```

Replace `apps/client/src/lib/storage/browser.ts` entirely:

```ts
import type { StarCluster } from '$lib/types/stellar';
import type { StorageProvider } from '$lib/storage';
import type { GenerationSettings } from '$lib/types/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';

export class BrowserStorage implements StorageProvider {
	private readonly STORAGE_KEY = 'horizonis_cluster';
	private readonly SETTINGS_KEY = 'horizonis_generation_settings';

	async getCluster(): Promise<StarCluster> {
		const data = localStorage.getItem(this.STORAGE_KEY);
		if (!data) {
			throw new Error('No cluster found in local storage');
		}
		return JSON.parse(data);
	}

	async saveCluster(cluster: StarCluster): Promise<void> {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cluster));
	}

	async generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster> {
		const { generate_cluster } = await import('procedural-gen');
		const s = seed ?? BigInt(Math.floor(Math.random() * 1000000));
		const cluster = generate_cluster(s, settings ?? defaultGenerationSettings);
		await this.saveCluster(cluster);
		return cluster;
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { compute_route } = await import('procedural-gen');
		const cluster = await this.getCluster();
		return compute_route(cluster, startId, endId);
	}

	async getGenerationSettings(): Promise<GenerationSettings> {
		const data = localStorage.getItem(this.SETTINGS_KEY);
		if (!data) return defaultGenerationSettings;
		try {
			return JSON.parse(data);
		} catch {
			return defaultGenerationSettings;
		}
	}

	async saveGenerationSettings(settings: GenerationSettings): Promise<void> {
		localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
	}
}
```

- [ ] **Step 5: Extract the shared storage-provider resolver**

Create `apps/client/src/lib/storage/provider.ts`:

```ts
import { TauriStorage } from './tauri';
import { BrowserStorage } from './browser';
import type { StorageProvider } from './index';

let storage: StorageProvider | null = null;

export function _resetStorageProvider(): void {
	storage = null;
}

export async function getStorageProvider(): Promise<StorageProvider> {
	if (storage) return storage;

	// @ts-expect-error - Tauri global
	if (window.__TAURI_INTERNALS__) {
		storage = new TauriStorage();
	} else {
		storage = new BrowserStorage();
	}
	return storage;
}
```

- [ ] **Step 6: Add the `generationSettings` store**

Create `apps/client/src/lib/stores/generationSettings.ts`:

```ts
import { writable } from 'svelte/store';
import { getStorageProvider } from '$lib/storage/provider';
import type { GenerationSettings } from '$lib/types/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';
import { toast } from '$lib/stores/toast';

export const generationSettings = writable<GenerationSettings>(defaultGenerationSettings);

export async function loadGenerationSettings(): Promise<GenerationSettings> {
	const provider = await getStorageProvider();
	try {
		const settings = await provider.getGenerationSettings();
		generationSettings.set(settings);
		return settings;
	} catch (e) {
		console.warn('Failed to load generation settings, using defaults:', e);
		generationSettings.set(defaultGenerationSettings);
		return defaultGenerationSettings;
	}
}

export async function saveGenerationSettings(settings: GenerationSettings): Promise<void> {
	const provider = await getStorageProvider();
	try {
		await provider.saveGenerationSettings(settings);
		generationSettings.set(settings);
	} catch (e) {
		console.error('Failed to save generation settings:', e);
		toast.error('Failed to save generation settings');
		throw e;
	}
}
```

- [ ] **Step 7: Rewire `clusterData.ts` onto the shared provider and pass current settings**

Replace `apps/client/src/lib/stores/clusterData.ts`'s top section:

```ts
import { writable } from 'svelte/store';
import { TauriStorage } from '$lib/storage/tauri';
import { BrowserStorage } from '$lib/storage/browser';
import type { StorageProvider } from '$lib/storage';
import type { StarCluster } from '$lib/types/stellar';
import { toast } from '$lib/stores/toast';
export const cluster = writable<StarCluster | null>(null);
export const isInitialized = writable(false);

let storage: StorageProvider | null = null;

export function _resetStorage() {
	storage = null;
}

async function getStorage() {
	if (storage) return storage;

	// @ts-expect-error - Tauri global
	if (window.__TAURI_INTERNALS__) {
		storage = new TauriStorage();
	} else {
		storage = new BrowserStorage();
	}
	return storage;
}
```

with:

```ts
import { get, writable } from 'svelte/store';
import { getStorageProvider, _resetStorageProvider } from '$lib/storage/provider';
import type { StarCluster } from '$lib/types/stellar';
import { toast } from '$lib/stores/toast';
import { generationSettings } from '$lib/stores/generationSettings';

export const cluster = writable<StarCluster | null>(null);
export const isInitialized = writable(false);

export function _resetStorage() {
	_resetStorageProvider();
}
```

Then, further down in the same file, replace every `await getStorage()` with
`await getStorageProvider()` (there are three call sites: `loadCluster`,
`saveCluster`, `generateNewCluster`).

Finally, update the two generation call sites to pass current settings.
Change:

```ts
		const newCluster = await provider.generateCluster();
```

(inside `loadCluster`'s catch block) to:

```ts
		const newCluster = await provider.generateCluster(undefined, get(generationSettings));
```

And change:

```ts
export async function generateNewCluster(seed?: bigint) {
	console.log('Generating new cluster...');
	const provider = await getStorage();
	try {
		const newCluster = await provider.generateCluster(seed);
```

to:

```ts
export async function generateNewCluster(seed?: bigint) {
	console.log('Generating new cluster...');
	const provider = await getStorageProvider();
	try {
		const newCluster = await provider.generateCluster(seed, get(generationSettings));
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd apps/client && npx vitest run src/lib/stores/generationSettings.test.ts src/lib/stores/clusterData.test.ts`
Expected: all tests pass, including the two updated `clusterData.test.ts` assertions.

Run: `cd apps/client && npx vitest run`
Expected: full suite passes (confirms `provider.ts`/`clusterData.ts` changes
don't break `Navigation.test.ts` or anything else importing `clusterData`).

- [ ] **Step 9: Lint, commit**

Run: `cd apps/client && npx eslint . && npx prettier --check .`
Expected: no errors. If prettier reports formatting diffs, run
`npx prettier --write .` on the files this task touched and re-check.

```bash
git add apps/client/src/lib/types/generationSettings.ts \
  apps/client/src/lib/storage/provider.ts \
  apps/client/src/lib/storage/index.ts \
  apps/client/src/lib/storage/tauri.ts \
  apps/client/src/lib/storage/browser.ts \
  apps/client/src/lib/stores/generationSettings.ts \
  apps/client/src/lib/stores/generationSettings.test.ts \
  apps/client/src/lib/stores/clusterData.ts \
  apps/client/src/lib/stores/clusterData.test.ts
git commit -m "$(cat <<'EOF'
Add GenerationSettings storage layer and store

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Extract the shared regenerate flow

**Files:**
- Create: `apps/client/src/lib/actions/regenerate.ts`
- Create: `apps/client/src/lib/actions/regenerate.test.ts`
- Modify: `apps/client/src/lib/components/Navigation.svelte`

**Interfaces:**
- Consumes: `generateNewCluster` (Task 6), `cluster` store, `recordSnapshot` (`$lib/stores/history`), `toast` (`$lib/stores/toast`), `nativeConfirm` (`$lib/platform/confirm`).
- Produces: `performRegenerate(onDone?: () => void): Promise<void>` and
  `requestRegenerate(callbacks: { onDone?: () => void; onShowConfirm: () => void }): Promise<void>`.
  Task 8 (`/settings` page) imports both.

This is a pure refactor: `Navigation.svelte`'s regenerate behavior must be
byte-for-byte identical before and after, so `Navigation.test.ts` (unchanged)
is the regression guard, plus a new test file exercising the extracted
functions directly.

- [ ] **Step 1: Write the failing tests for the extracted module**

Create `apps/client/src/lib/actions/regenerate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { performRegenerate, requestRegenerate } from './regenerate';
import { cluster } from '$lib/stores/clusterData';
import { canUndo } from '$lib/stores/history';
import { toasts, clearToasts } from '$lib/stores/toast';
import type { StarCluster } from '$lib/types/stellar';

const { mockGenerateNewCluster, mockNativeConfirm } = vi.hoisted(() => ({
	mockGenerateNewCluster: vi.fn(),
	mockNativeConfirm: vi.fn()
}));

vi.mock('$lib/stores/clusterData', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('$lib/stores/clusterData');
	return {
		...original,
		generateNewCluster: mockGenerateNewCluster
	};
});

vi.mock('$lib/platform/confirm', () => ({
	nativeConfirm: mockNativeConfirm
}));

const previousCluster: StarCluster = { Name: 'Previous', Systems: [] };
const nextCluster: StarCluster = { Name: 'Next', Systems: [] };

describe('regenerate actions', () => {
	beforeEach(() => {
		cluster.set(previousCluster);
		vi.clearAllMocks();
		clearToasts();
		mockGenerateNewCluster.mockResolvedValue(nextCluster);
		mockNativeConfirm.mockResolvedValue(null);
	});

	it('generates a new cluster, records the previous snapshot, and toasts success', async () => {
		const onDone = vi.fn();

		await performRegenerate(onDone);

		expect(mockGenerateNewCluster).toHaveBeenCalledWith();
		expect(get(canUndo)).toBe(true);
		expect(onDone).toHaveBeenCalledOnce();
		expect(get(toasts)).toHaveLength(1);
		expect(get(toasts)[0]).toMatchObject({ type: 'success' });
	});

	it('does not record a snapshot or call onDone when generation fails', async () => {
		mockGenerateNewCluster.mockRejectedValue(new Error('boom'));
		const onDone = vi.fn();

		await performRegenerate(onDone);

		expect(get(canUndo)).toBe(false);
		expect(onDone).not.toHaveBeenCalled();
	});

	it('requests native confirm and regenerates immediately when accepted', async () => {
		mockNativeConfirm.mockResolvedValue(true);
		const onDone = vi.fn();
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onDone, onShowConfirm });

		expect(mockGenerateNewCluster).toHaveBeenCalledWith();
		expect(onShowConfirm).not.toHaveBeenCalled();
	});

	it('falls back to the in-app confirm dialog when native confirm is unavailable', async () => {
		mockNativeConfirm.mockResolvedValue(null);
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onShowConfirm });

		expect(mockGenerateNewCluster).not.toHaveBeenCalled();
		expect(onShowConfirm).toHaveBeenCalledOnce();
	});

	it('does nothing when native confirm is declined', async () => {
		mockNativeConfirm.mockResolvedValue(false);
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onShowConfirm });

		expect(mockGenerateNewCluster).not.toHaveBeenCalled();
		expect(onShowConfirm).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/client && npx vitest run src/lib/actions/regenerate.test.ts`
Expected: FAIL — `./regenerate` module doesn't exist yet.

- [ ] **Step 3: Implement the shared module**

Create `apps/client/src/lib/actions/regenerate.ts`:

```ts
import { get } from 'svelte/store';
import { cluster, generateNewCluster } from '$lib/stores/clusterData';
import { recordSnapshot } from '$lib/stores/history';
import { toast } from '$lib/stores/toast';
import { nativeConfirm } from '$lib/platform/confirm';

export interface RegenerateCallbacks {
	onDone?: () => void;
	onShowConfirm: () => void;
}

export async function performRegenerate(onDone?: () => void): Promise<void> {
	const previous = get(cluster);
	try {
		await generateNewCluster();
		if (previous) recordSnapshot(previous);
		onDone?.();
		toast.success('New cluster generated — press Ctrl/Cmd+Z to undo');
	} catch {
		// generateNewCluster already surfaces an error toast.
	}
}

export async function requestRegenerate(callbacks: RegenerateCallbacks): Promise<void> {
	const accepted = await nativeConfirm({
		title: 'Generate a new cluster?',
		message: 'This replaces your current cluster. You can undo it right after.',
		confirmLabel: 'Generate',
		cancelLabel: 'Cancel',
		kind: 'warning'
	});

	if (accepted === true) {
		await performRegenerate(callbacks.onDone);
	} else if (accepted === null) {
		callbacks.onShowConfirm();
	}
}
```

- [ ] **Step 4: Rewire `Navigation.svelte` onto the shared module**

In `apps/client/src/lib/components/Navigation.svelte`, replace:

```svelte
	import { cluster, generateNewCluster } from '$lib/stores/clusterData';
```

with:

```svelte
	import { cluster } from '$lib/stores/clusterData';
	import { performRegenerate, requestRegenerate } from '$lib/actions/regenerate';
```

Remove the now-unused `import { recordSnapshot } from '$lib/stores/history';`
and `import { get } from 'svelte/store';` lines **only if** nothing else in
the file uses `get` (it's used by `goToCluster`'s sibling `goBack`? — check:
`get(selectedEntity)` isn't used in `Navigation.svelte`; the only prior use
of `get` was `get(cluster)` inside the old `confirmRegenerate`). Since this
component doesn't use `get` or `recordSnapshot` anywhere else, remove both
imports.

Replace the component's regenerate logic:

```svelte
	async function confirmRegenerate() {
		regenerating = true;
		const previous = get(cluster);
		try {
			await generateNewCluster();
			if (previous) recordSnapshot(previous);
			goToCluster();
			toast.success('New cluster generated — press Ctrl/Cmd+Z to undo');
		} catch {
			// generateNewCluster already surfaces an error toast.
		} finally {
			regenerating = false;
			showRegenerateConfirm = false;
		}
	}

	async function requestRegenerate() {
		const accepted = await nativeConfirm({
			title: 'Generate a new cluster?',
			message: 'This replaces your current cluster. You can undo it right after.',
			confirmLabel: 'Generate',
			cancelLabel: 'Cancel',
			kind: 'warning'
		});

		if (accepted === true) {
			await confirmRegenerate();
		} else if (accepted === null) {
			showRegenerateConfirm = true;
		}
	}
```

with:

```svelte
	async function confirmRegenerate() {
		regenerating = true;
		await performRegenerate(goToCluster);
		regenerating = false;
		showRegenerateConfirm = false;
	}

	async function requestRegen() {
		await requestRegenerate({
			onDone: goToCluster,
			onShowConfirm: () => (showRegenerateConfirm = true)
		});
	}
```

Update the button that called `requestRegenerate` directly — change:

```svelte
		<button
			onclick={requestRegenerate}
```

to:

```svelte
		<button
			onclick={requestRegen}
```

(The `toast` import stays — it's still used elsewhere? Check: after this
change `toast` is no longer referenced in `Navigation.svelte` since the
success toast moved into `regenerate.ts`. Remove the
`import { toast } from '$lib/stores/toast';` line too, since nothing else in
this component calls `toast.*`. Also remove
`import { nativeConfirm } from '$lib/platform/confirm';`, now unused here.)

- [ ] **Step 5: Run the full frontend test suite to verify nothing regressed**

Run: `cd apps/client && npx vitest run`
Expected: all tests pass, including `Navigation.test.ts` unchanged and the
new `regenerate.test.ts`.

- [ ] **Step 6: Lint, commit**

Run: `cd apps/client && npx eslint . && npx prettier --check .`
Expected: no errors (run `npx prettier --write .` and re-check if needed).

```bash
git add apps/client/src/lib/actions/regenerate.ts \
  apps/client/src/lib/actions/regenerate.test.ts \
  apps/client/src/lib/components/Navigation.svelte
git commit -m "$(cat <<'EOF'
Extract shared regenerate-cluster flow out of Navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `/settings` route page

**Files:**
- Create: `apps/client/src/routes/settings/+page.svelte`
- Create: `apps/client/src/routes/settings/+page.test.ts`

**Interfaces:**
- Consumes: `generationSettings`, `loadGenerationSettings`, `saveGenerationSettings`
  (Task 6); `performRegenerate`, `requestRegenerate` (Task 7);
  `defaultGenerationSettings` (Task 6); `ConfirmDialog` (existing component).
- Produces: the `/settings` route. Task 9's nav icon links here via `goto('/settings')`.

- [ ] **Step 1: Write the failing component tests**

Create `apps/client/src/routes/settings/+page.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SettingsPage from './+page.svelte';
import { generationSettings } from '$lib/stores/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';

const { mockGoto, mockSaveGenerationSettings, mockRequestRegenerate } = vi.hoisted(() => ({
	mockGoto: vi.fn(),
	mockSaveGenerationSettings: vi.fn().mockResolvedValue(undefined),
	mockRequestRegenerate: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto
}));

vi.mock('$lib/stores/generationSettings', async (importOriginal) => {
	const original =
		(await importOriginal()) as typeof import('$lib/stores/generationSettings');
	return {
		...original,
		saveGenerationSettings: mockSaveGenerationSettings
	};
});

vi.mock('$lib/actions/regenerate', () => ({
	requestRegenerate: mockRequestRegenerate,
	performRegenerate: vi.fn().mockResolvedValue(undefined)
}));

describe('settings page', () => {
	beforeEach(() => {
		generationSettings.set(defaultGenerationSettings);
		vi.clearAllMocks();
	});

	it('renders the current settings values', () => {
		render(SettingsPage);

		expect(screen.getByLabelText(/minimum systems/i)).toHaveValue(15);
		expect(screen.getByLabelText(/maximum systems/i)).toHaveValue(25);
		expect(screen.getByLabelText(/max planets per star/i)).toHaveValue(8);
	});

	it('disables Save & Generate when the system count range is invalid', async () => {
		render(SettingsPage);

		const min = screen.getByLabelText(/minimum systems/i);
		await fireEvent.input(min, { target: { value: '30' } });

		expect(screen.getByRole('button', { name: /save & generate/i })).toBeDisabled();
		expect(screen.getByText(/minimum must be less than or equal to maximum/i)).toBeInTheDocument();
	});

	it('saves settings and requests regeneration on Save & Generate', async () => {
		render(SettingsPage);

		const maxBodies = screen.getByLabelText(/max planets per star/i);
		await fireEvent.input(maxBodies, { target: { value: '4' } });
		await fireEvent.click(screen.getByRole('button', { name: /save & generate/i }));

		expect(mockSaveGenerationSettings).toHaveBeenCalledWith(
			expect.objectContaining({ MaxBodiesPerStar: 4 })
		);
		expect(mockRequestRegenerate).toHaveBeenCalledWith(
			expect.objectContaining({ onShowConfirm: expect.any(Function) })
		);
	});

	it('resets staged edits to defaults without saving', async () => {
		render(SettingsPage);

		const maxBodies = screen.getByLabelText(/max planets per star/i);
		await fireEvent.input(maxBodies, { target: { value: '2' } });
		await fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

		expect(screen.getByLabelText(/max planets per star/i)).toHaveValue(
			defaultGenerationSettings.MaxBodiesPerStar
		);
		expect(mockSaveGenerationSettings).not.toHaveBeenCalled();
	});

	it('navigates back without saving on Cancel', async () => {
		render(SettingsPage);

		await fireEvent.click(screen.getByRole('link', { name: /cancel/i }));

		expect(mockSaveGenerationSettings).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/client && npx vitest run src/routes/settings/+page.test.ts`
Expected: FAIL — `./+page.svelte` doesn't exist yet.

- [ ] **Step 3: Implement the settings page**

Create `apps/client/src/routes/settings/+page.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { generationSettings, saveGenerationSettings } from '$lib/stores/generationSettings';
	import { defaultGenerationSettings } from '$lib/types/generationSettings';
	import type { GenerationSettings } from '$lib/types/generationSettings';
	import { performRegenerate, requestRegenerate } from '$lib/actions/regenerate';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let local = $state<GenerationSettings>({ ...$generationSettings });
	let showRegenerateConfirm = $state(false);
	let regenerating = $state(false);
	let saving = $state(false);

	let errors = $derived.by(() => {
		const list: string[] = [];
		if (local.SystemCountMin < 1) {
			list.push('Minimum systems must be at least 1.');
		}
		if (local.SystemCountMin > local.SystemCountMax) {
			list.push('Minimum must be less than or equal to maximum systems.');
		}
		if (local.MaxBodiesPerStar < 0) {
			list.push('Max planets per star cannot be negative.');
		}
		return list;
	});

	function toPercent(fraction: number): number {
		return Math.round(fraction * 100);
	}

	function fromPercent(percent: number): number {
		return percent / 100;
	}

	async function saveAndGenerate() {
		saving = true;
		try {
			await saveGenerationSettings(local);
			await requestRegenerate({
				onDone: () => goto('/'),
				onShowConfirm: () => (showRegenerateConfirm = true)
			});
		} finally {
			saving = false;
		}
	}

	async function confirmRegenerate() {
		regenerating = true;
		await performRegenerate(() => goto('/'));
		regenerating = false;
		showRegenerateConfirm = false;
	}

	function resetToDefaults() {
		local = { ...defaultGenerationSettings };
	}
</script>

<main
	class="w-screen h-screen overflow-y-auto bg-slate-950 text-slate-100 flex justify-center px-4 py-12"
>
	<div class="w-full max-w-xl">
		<h1 class="text-xl font-bold mb-1">Generation Settings</h1>
		<p class="text-sm text-slate-400 mb-8">
			These settings apply the next time you generate a new cluster.
		</p>

		<div class="space-y-6">
			<fieldset class="grid grid-cols-2 gap-4">
				<legend class="text-sm font-medium text-slate-300 mb-2 col-span-2">
					Systems in cluster
				</legend>
				<label class="flex flex-col gap-1 text-sm text-slate-400">
					Minimum systems
					<input
						type="number"
						min="1"
						bind:value={local.SystemCountMin}
						class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm text-slate-400">
					Maximum systems
					<input
						type="number"
						min="1"
						bind:value={local.SystemCountMax}
						class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
					/>
				</label>
			</fieldset>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Multi-star systems (%)
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.MultiStarChance)}
					oninput={(e) => (local.MultiStarChance = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Trinary systems, as % of multi-star systems
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.TrinaryRatio)}
					oninput={(e) => (local.TrinaryRatio = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Max planets per star
				<input
					type="number"
					min="0"
					bind:value={local.MaxBodiesPerStar}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Asteroid belt frequency (%)
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.AsteroidBeltChance)}
					oninput={(e) => (local.AsteroidBeltChance = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="checkbox" bind:checked={local.DisallowCircumbinaryBodies} />
				Never place planets around multi-star systems as a whole
			</label>

			{#if errors.length > 0}
				<ul class="text-sm text-rose-400 space-y-1" role="alert">
					{#each errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}

			<div class="flex flex-wrap gap-3 pt-4">
				<button
					onclick={saveAndGenerate}
					disabled={errors.length > 0 || saving}
					class="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
				>
					Save & Generate New Cluster
				</button>
				<button
					onclick={resetToDefaults}
					class="bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-lg text-sm transition-colors"
				>
					Reset to Defaults
				</button>
				<a
					href="/"
					class="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
				>
					Cancel
				</a>
			</div>
		</div>
	</div>
</main>

<ConfirmDialog
	open={showRegenerateConfirm}
	title="Generate a new cluster?"
	message="This replaces your current cluster. You can undo it right after."
	confirmLabel="Generate"
	busy={regenerating}
	onconfirm={confirmRegenerate}
	oncancel={() => (showRegenerateConfirm = false)}
/>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/client && npx vitest run src/routes/settings/+page.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Run the full frontend suite, lint, commit**

Run: `cd apps/client && npx vitest run`
Expected: all tests pass.

Run: `cd apps/client && npx eslint . && npx prettier --check .`
Expected: no errors (run `npx prettier --write .` and re-check if needed).

```bash
git add apps/client/src/routes/settings/+page.svelte apps/client/src/routes/settings/+page.test.ts
git commit -m "$(cat <<'EOF'
Add /settings route for configuring cluster generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Navigation settings icon

**Files:**
- Modify: `apps/client/src/lib/components/Navigation.svelte`
- Modify: `apps/client/src/lib/components/Navigation.test.ts`

**Interfaces:**
- Consumes: `/settings` route (Task 8).
- Produces: a visible, accessible "Generation settings" nav button.

- [ ] **Step 1: Write the failing test**

In `apps/client/src/lib/components/Navigation.test.ts`, add near the other
button-presence tests (after `renders Cluster breadcrumb by default`):

```ts
	it('renders a link to the generation settings page', () => {
		render(Navigation);

		const link = screen.getByRole('link', { name: /generation settings/i });
		expect(link).toHaveAttribute('href', '/settings');
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/client && npx vitest run src/lib/components/Navigation.test.ts`
Expected: FAIL — no element with accessible name "generation settings".

- [ ] **Step 3: Add the icon**

In `apps/client/src/lib/components/Navigation.svelte`, add `Settings` to the
lucide-svelte import:

```svelte
	import { ChevronRight, ArrowLeft, Home, Search, HelpCircle, RotateCw, Settings } from 'lucide-svelte';
```

Add the link right before the existing "Generate New Cluster" button:

```svelte
		<a
			href="/settings"
			class="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
			title="Generation settings"
			aria-label="Generation settings"
		>
			<Settings size={20} aria-hidden="true" />
		</a>

		<button
			onclick={requestRegen}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/client && npx vitest run src/lib/components/Navigation.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Lint, commit**

Run: `cd apps/client && npx eslint . && npx prettier --check .`
Expected: no errors (run `npx prettier --write .` and re-check if needed).

```bash
git add apps/client/src/lib/components/Navigation.svelte apps/client/src/lib/components/Navigation.test.ts
git commit -m "$(cat <<'EOF'
Add Navigation link to the generation settings page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Full-repo verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full verification suite**

Run: `pnpm run verify`
Expected: `check`, `lint`, and `test` all pass for every project
(`procedural-gen`, `horizonis-shell`, `horizonis-client`).

- [ ] **Step 2: Fix any stragglers**

If `svelte-check` flags type issues in `+page.svelte` (e.g. the `oninput`
handlers' `e.currentTarget.value` typing), narrow the event type explicitly,
e.g.:

```ts
oninput={(e: Event & { currentTarget: HTMLInputElement }) =>
	(local.MultiStarChance = fromPercent(+e.currentTarget.value))}
```

Apply the same pattern to the other two percent-input `oninput` handlers if
`svelte-check` reports the same warning for them, then re-run
`pnpm nx check horizonis-client`.

- [ ] **Step 3: Re-run verification and commit any fixes**

Run: `pnpm run verify`
Expected: all green.

```bash
git add -A
git commit -m "$(cat <<'EOF'
Fix type-check fallout from generation settings UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Skip this commit if Step 1 was already clean — nothing to commit.)
