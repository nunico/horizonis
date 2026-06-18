# Subtle orbit rings + realistic asteroid belts (Realistic style)

**Date:** 2026-06-18
**Status:** Approved (design)
**Scope:** `apps/client` — declarative map-style renderer and the `realistic`
built-in style.

## Problem

In the Realistic style two things read poorly:

1. **Orbit rings are too loud.** At rest they sit at alpha `0.30`, competing
   with the bodies they orbit.
2. **Asteroid belts aren't realistic.** Orbital regions render as a single flat
   translucent annulus — a coloured donut, not a field of rocks.

## Goals

- Make resting orbit rings in the Realistic style noticeably quieter without
  changing hover/selection behaviour.
- Render asteroid belts (orbital regions) in the Realistic style as a scattered,
  deterministic field of small particles instead of a solid band.
- Change nothing for the `tactical` style or any imported/exported style.

## Non-goals

- No per-frame rescaling of belt particles (see Trade-offs).
- No animation/orbital motion of particles.
- No new region data on the domain model (`OrbitalRegion` is unchanged).

## Context

Relevant code:

- `apps/client/src/lib/components/SolarSystemMap.svelte` — calls
  `styleRegion(graphics, { innerRadius, outerRadius })` **once per region at
  render time** (`renderRegion`, and the per-star region loop in `renderStar`).
  It is **not** called in the per-frame `updateScales` hover loop, so a region
  `Graphics` is drawn once and then only transformed by the viewport.
- `apps/client/src/lib/styles/declarative.ts` — `styleRegion` currently draws
  one `circle(...).stroke(...)` annulus using `colors.region` and
  `def.stroke.region.alpha`.
- `apps/client/src/lib/styles/types.ts` — `StyleDefinition`, `RegionContext`,
  `MapStyle`.
- `apps/client/src/lib/styles/builtins/realistic.ts` — the target style.
- `apps/client/src/lib/styles/procedural/noise.ts` — `createRng(seed)`
  (mulberry32), reused for deterministic scatter. No new infrastructure needed.

## Design

### 1. Subtle orbit rings (data only)

In `realistic.ts`, change `stroke.orbit.alpha` from `0.3` to `0.1`. Width
(`1`) and the emphasis logic in `styleOrbit` (hover → `orbitHover`, selected →
`accent`, both at alpha `0.8` with doubled width) are unchanged, so hovered and
selected rings brighten exactly as today; only the resting state is quieter.

No type or renderer changes. No other style is touched.

### 2. Realistic asteroid belts (scattered field)

#### Data model

Add an optional `regionStyle` to `StyleDefinition` so the choice stays
JSON-serializable and exportable:

```ts
export type RegionStyleKind = 'band' | 'scatter';

export interface RegionStyleSpec {
  kind: RegionStyleKind;
  /** scatter only — particles per 10,000 px² of band area. Default 6. */
  density?: number;
  /** scatter only — [min, max] particle radius in px. Default [0.4, 1.8]. */
  sizeRange?: [number, number];
  /** scatter only — [min, max] per-particle alpha. Default [0.25, 0.9]. */
  alphaRange?: [number, number];
}

// StyleDefinition gains:
//   /** How orbital regions (asteroid belts) render. Absent ⇒ 'band'. */
//   regionStyle?: RegionStyleSpec;
```

- Absent `regionStyle` ⇒ `'band'` ⇒ current behaviour. `tactical` and every
  imported style render unchanged with no migration.
- `realistic.ts` opts in with `regionStyle: { kind: 'scatter' }` and relies on
  the defaults.

#### Rendering (declarative `styleRegion`)

When the resolved kind is `'band'`, keep the existing annulus stroke verbatim.

When `'scatter'`:

1. **Seed** `createRng` from the rounded radii:
   `seed = (round(innerRadius) * 73856093) ^ (round(outerRadius) * 19349663)`.
   Deterministic and identical on every reload; no global state.
2. **Count**: `area = π·(outer² − inner²)`;
   `count = clamp(round(area / 10000 * density), 0, 800)`. Wide belts get more
   rocks, thin belts fewer; hard cap bounds the draw cost (drawn once, not per
   frame).
3. **Per particle**:
   - angle `θ = rng() · 2π`.
   - radius biased toward mid-belt: `u = (rng()+rng()+rng())/3` (bell-ish about
     0.5), `r = inner + (outer − inner)·u` — thins at both edges.
   - position `(cos θ · r, sin θ · r)`.
   - size `= lerp(sizeRange, rng())`; alpha `= lerp(alphaRange, rng())`.
   - `graphics.circle(x, y, size).fill({ color: colors.region, alpha })`.
4. Start with `graphics.clear()` (matches all other `style*` methods).

A new `RegionContext` stays sufficient (`innerRadius`, `outerRadius`); the
renderer already closes over `def.regionStyle` and `colors.region`.

### 3. Trade-offs

- **Particles scale with zoom.** Region `Graphics` are static viewport children,
  so specks enlarge when zoomed in — identical to how the current band scales.
  Accepted for v1; the bodies still dominate at high zoom. Per-frame rescaling
  would require wiring regions into `updateScales`, which is out of scope.
- **Draw cost.** Up to 800 circle fills per region, drawn once at render time
  (not in the hover loop). Acceptable; the cap bounds the worst case.

## Testing (TDD)

`declarative.test.ts` (mock `Graphics`, capturing `circle`/`fill`/`stroke`/
`clear` calls — no renderer needed):

- Absent `regionStyle` and `kind:'band'` → one `circle` + one `stroke`
  (annulus), no `fill` — current behaviour preserved.
- `kind:'scatter'` → many `fill` calls, zero `stroke`; every particle radius
  `hypot(x,y)` lies within `[innerRadius, outerRadius]`.
- Determinism: two calls with the same context produce identical particle
  count and positions.
- Density/size/alpha knobs: higher `density` ⇒ more particles; particle radii
  and alphas fall within the configured ranges.
- Edge case: `outerRadius <= innerRadius` ⇒ zero particles, no throw.

`realistic` style test:

- `regionStyle.kind === 'scatter'`.
- `stroke.orbit.alpha === 0.1`.

## Rollout

Single PR on `feat/pluggable-map-styles`. No data migration, no user-facing
config, no breaking change to the exported style format (new field is optional
and back-compatible).
