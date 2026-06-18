# Subtle Orbit Rings + Realistic Asteroid Belts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the `realistic` map style, quiet the resting orbit rings and render asteroid belts (orbital regions) as a deterministic scattered field of particles instead of a solid band.

**Architecture:** Add an optional `regionStyle` field to the serializable `StyleDefinition`. The declarative renderer's `styleRegion` branches on it: `'band'` (default, unchanged) keeps the annulus stroke; `'scatter'` draws many small seeded circle fills using the existing `createRng` mulberry32 PRNG. `realistic.ts` opts into scatter and drops its orbit alpha to `0.1`. No other style changes.

**Tech Stack:** TypeScript, Svelte 5, PixiJS v8 (`Graphics`), Vitest. Spec: `docs/superpowers/specs/2026-06-18-subtle-orbits-realistic-belts-design.md`.

---

## File Structure

- **Modify** `apps/client/src/lib/styles/types.ts` — add `RegionStyleKind`, `RegionStyleSpec`, and optional `regionStyle` on `StyleDefinition`.
- **Modify** `apps/client/src/lib/styles/declarative.ts` — import `createRng`; branch `styleRegion` on the resolved region kind; add a `drawScatterBelt` helper.
- **Modify** `apps/client/src/lib/styles/declarative.test.ts` — tests for band (default) vs scatter rendering, determinism, knobs, and edge cases.
- **Modify** `apps/client/src/lib/styles/builtins/realistic.ts` — set `stroke.orbit.alpha = 0.1` and add `regionStyle: { kind: 'scatter' }`.
- **Create** `apps/client/src/lib/styles/builtins/realistic.test.ts` — assert the two realistic-style data values.

Note: the test mock `Graphics` in `declarative.test.ts` already records `circles`, `fills`, `strokes`, and `cleared` — no mock changes are needed.

---

## Task 1: Add the `regionStyle` types

**Files:**
- Modify: `apps/client/src/lib/styles/types.ts`

- [ ] **Step 1: Add the type definitions**

In `apps/client/src/lib/styles/types.ts`, immediately after the `StrokeSpec` interface (around line 73), add:

```ts
/** How orbital regions (asteroid belts) render. */
export type RegionStyleKind = 'band' | 'scatter';

/**
 * Orbital-region (asteroid belt) appearance. `'band'` draws the legacy solid
 * annulus stroke; `'scatter'` draws a deterministic field of small particles.
 * Scatter knobs are optional and fall back to the defaults in the renderer.
 */
export interface RegionStyleSpec {
	kind: RegionStyleKind;
	/** scatter only — particles per 10,000 px² of band area. Default 6. */
	density?: number;
	/** scatter only — [min, max] particle radius in px. Default [0.4, 1.8]. */
	sizeRange?: [number, number];
	/** scatter only — [min, max] per-particle alpha. Default [0.25, 0.9]. */
	alphaRange?: [number, number];
}
```

- [ ] **Step 2: Add the optional field to `StyleDefinition`**

In the same file, in the `StyleDefinition` interface, add the field right after the `stroke: { ... }` line (around line 194):

```ts
	stroke: { orbit: StrokeSpec; portal: StrokeSpec; region: StrokeSpec };
	/** How orbital regions (asteroid belts) render. Absent ⇒ `'band'`. */
	regionStyle?: RegionStyleSpec;
```

- [ ] **Step 3: Verify it type-checks**

Run: `pnpm nx run client:check`
Expected: PASS (no type errors; the new field is optional so nothing else breaks).

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/lib/styles/types.ts
git commit -m "feat(styles): add optional regionStyle (band|scatter) to StyleDefinition

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Scatter rendering in the declarative renderer (TDD)

**Files:**
- Modify: `apps/client/src/lib/styles/declarative.ts`
- Test: `apps/client/src/lib/styles/declarative.test.ts`

The test file already mocks `pixi.js` with a `Graphics` that records `circles`, `fills`, `strokes`, and `cleared`, and exposes a `def(overrides)` factory whose palette `region` is `'#475569'`. Use those.

- [ ] **Step 1: Write the failing tests**

Append these tests to `apps/client/src/lib/styles/declarative.test.ts` (inside the top-level `describe`, or in a new `describe('styleRegion', ...)` block at the end of the file). They assume `Graphics` is the mocked class imported from `pixi.js`:

```ts
import { Graphics } from 'pixi.js';

describe('styleRegion', () => {
	it('draws a solid annulus when regionStyle is absent (band default)', () => {
		const style = createDeclarativeStyle(def());
		const g = new Graphics();

		style.styleRegion(g, { innerRadius: 100, outerRadius: 160 });

		// One circle + one stroke, no particle fills.
		expect(g.circles).toHaveLength(1);
		expect(g.strokes).toHaveLength(1);
		expect(g.fills).toHaveLength(0);
		expect(g.cleared).toBe(1);
	});

	it('draws a scattered particle field when kind is scatter', () => {
		const style = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter' } })
		);
		const g = new Graphics();

		style.styleRegion(g, { innerRadius: 100, outerRadius: 160 });

		// Many particle fills, no annulus stroke.
		expect(g.fills.length).toBeGreaterThan(20);
		expect(g.strokes).toHaveLength(0);
		expect(g.cleared).toBe(1);
		// One circle per particle.
		expect(g.circles).toHaveLength(g.fills.length);
	});

	it('keeps every scatter particle inside the [inner, outer] band', () => {
		const style = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter' } })
		);
		const g = new Graphics();
		const inner = 100;
		const outer = 160;

		style.styleRegion(g, { innerRadius: inner, outerRadius: outer });

		for (const c of g.circles) {
			const dist = Math.hypot(c.x, c.y);
			expect(dist).toBeGreaterThanOrEqual(inner);
			expect(dist).toBeLessThanOrEqual(outer);
		}
	});

	it('is deterministic: same context yields identical particles', () => {
		const style = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter' } })
		);
		const a = new Graphics();
		const b = new Graphics();

		style.styleRegion(a, { innerRadius: 100, outerRadius: 160 });
		style.styleRegion(b, { innerRadius: 100, outerRadius: 160 });

		expect(a.circles).toEqual(b.circles);
		expect(a.fills).toEqual(b.fills);
	});

	it('honors density, sizeRange, and alphaRange knobs', () => {
		const sparse = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter', density: 2 } })
		);
		const dense = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter', density: 20 } })
		);
		const gSparse = new Graphics();
		const gDense = new Graphics();

		sparse.styleRegion(gSparse, { innerRadius: 100, outerRadius: 160 });
		dense.styleRegion(gDense, { innerRadius: 100, outerRadius: 160 });
		expect(gDense.fills.length).toBeGreaterThan(gSparse.fills.length);

		const ranged = createDeclarativeStyle(
			def({
				regionStyle: {
					kind: 'scatter',
					sizeRange: [1, 2],
					alphaRange: [0.3, 0.5]
				}
			})
		);
		const g = new Graphics();
		ranged.styleRegion(g, { innerRadius: 100, outerRadius: 160 });

		for (const c of g.circles) {
			expect(c.r).toBeGreaterThanOrEqual(1);
			expect(c.r).toBeLessThanOrEqual(2);
		}
		for (const f of g.fills) {
			expect(f.alpha).toBeGreaterThanOrEqual(0.3);
			expect(f.alpha).toBeLessThanOrEqual(0.5);
			expect(f.color).toBe(0x475569); // palette.region
		}
	});

	it('draws nothing when outerRadius <= innerRadius', () => {
		const style = createDeclarativeStyle(
			def({ regionStyle: { kind: 'scatter' } })
		);
		const g = new Graphics();

		expect(() =>
			style.styleRegion(g, { innerRadius: 160, outerRadius: 100 })
		).not.toThrow();
		expect(g.fills).toHaveLength(0);
		expect(g.cleared).toBe(1);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm nx test client -- declarative`
Expected: the new `styleRegion` scatter tests FAIL (current `styleRegion` always draws one stroke, never fills), while the band-default test passes.

- [ ] **Step 3: Add the `createRng` import**

In `apps/client/src/lib/styles/declarative.ts`, add to the imports near the top (the `./procedural/textures` import is already present around line 5):

```ts
import { createRng } from './procedural/noise';
```

- [ ] **Step 4: Add the scatter helper**

In `apps/client/src/lib/styles/declarative.ts`, add this module-level helper (place it near the other top-level helpers such as `lighten`, above `createDeclarativeStyle`):

```ts
/** Linear interpolation between a [min, max] pair by t in [0, 1]. */
function lerpRange(range: readonly [number, number], t: number): number {
	return range[0] + (range[1] - range[0]) * t;
}

/**
 * Draw a deterministic asteroid belt: small particles scattered across the
 * [inner, outer] band, biased toward the middle so the field thins at both
 * edges. Seeded from the rounded radii, so a belt looks identical on every
 * reload. Particle count scales with band area and is hard-capped for cost.
 * Time complexity: O(count), with count ≤ 800.
 */
function drawScatterBelt(
	graphics: Graphics,
	inner: number,
	outer: number,
	color: number,
	spec: RegionStyleSpec
): void {
	if (outer <= inner) return;

	const density = spec.density ?? 6;
	const sizeRange = spec.sizeRange ?? [0.4, 1.8];
	const alphaRange = spec.alphaRange ?? [0.25, 0.9];

	const area = Math.PI * (outer * outer - inner * inner);
	const count = Math.min(800, Math.round((area / 10000) * density));

	const seed = (Math.round(inner) * 73856093) ^ (Math.round(outer) * 19349663);
	const rng = createRng(seed);

	for (let i = 0; i < count; i++) {
		const angle = rng() * Math.PI * 2;
		// Average three uniforms → bell-ish bias toward the band's middle.
		const u = (rng() + rng() + rng()) / 3;
		const radius = inner + (outer - inner) * u;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		const size = lerpRange(sizeRange, rng());
		const alpha = lerpRange(alphaRange, rng());
		graphics.circle(x, y, size).fill({ color, alpha });
	}
}
```

- [ ] **Step 5: Add the type import**

Ensure `RegionStyleSpec` is imported in `declarative.ts`. The file already imports many type names from `'./types'` (block starting around line 12); add `RegionStyleSpec` to that import list:

```ts
	OrbitContext,
	RegionContext,
	RegionStyleSpec,
	LabelKind,
```

- [ ] **Step 6: Branch `styleRegion` on the region kind**

In `apps/client/src/lib/styles/declarative.ts`, replace the current `styleRegion` method (around lines 262-269):

```ts
		styleRegion(graphics: Graphics, ctx: RegionContext): void {
			const width = Math.max(0, ctx.outerRadius - ctx.innerRadius);
			graphics.clear().circle(0, 0, ctx.outerRadius).stroke({
				width,
				color: colors.region,
				alpha: def.stroke.region.alpha
			});
		},
```

with:

```ts
		styleRegion(graphics: Graphics, ctx: RegionContext): void {
			graphics.clear();
			const regionStyle = def.regionStyle;
			if (regionStyle?.kind === 'scatter') {
				drawScatterBelt(
					graphics,
					ctx.innerRadius,
					ctx.outerRadius,
					colors.region,
					regionStyle
				);
				return;
			}
			const width = Math.max(0, ctx.outerRadius - ctx.innerRadius);
			graphics.circle(0, 0, ctx.outerRadius).stroke({
				width,
				color: colors.region,
				alpha: def.stroke.region.alpha
			});
		},
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm nx test client -- declarative`
Expected: PASS — all `styleRegion` tests green, plus the pre-existing declarative tests.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/lib/styles/declarative.ts apps/client/src/lib/styles/declarative.test.ts
git commit -m "feat(styles): render scatter-mode asteroid belts in declarative renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Apply to the realistic style (TDD)

**Files:**
- Modify: `apps/client/src/lib/styles/builtins/realistic.ts`
- Create: `apps/client/src/lib/styles/builtins/realistic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/lib/styles/builtins/realistic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { realisticStyle } from './realistic';

describe('realisticStyle', () => {
	it('uses subtle resting orbit rings (alpha 0.1)', () => {
		// Arrange / Act
		const alpha = realisticStyle.stroke.orbit.alpha;

		// Assert
		expect(alpha).toBe(0.1);
	});

	it('renders asteroid belts as a scattered field', () => {
		// Arrange / Act
		const regionStyle = realisticStyle.regionStyle;

		// Assert
		expect(regionStyle?.kind).toBe('scatter');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm nx test client -- realistic`
Expected: FAIL — orbit alpha is currently `0.3` and `regionStyle` is `undefined`.

- [ ] **Step 3: Lower the orbit alpha**

In `apps/client/src/lib/styles/builtins/realistic.ts`, in the `stroke` block (around line 58), change the orbit alpha:

```ts
	stroke: {
		orbit: { width: 1, alpha: 0.1 },
		portal: { width: 2, alpha: 0.55 },
		region: { width: 1, alpha: 0.18 }
	},
```

- [ ] **Step 4: Add the scatter region style**

In the same file, immediately after the `stroke: { ... }` block, add:

```ts
	// Asteroid belts as a scattered field of small rocks rather than a solid
	// translucent band — far more believable than a flat coloured annulus.
	regionStyle: { kind: 'scatter' },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm nx test client -- realistic`
Expected: PASS — both assertions green.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/lib/styles/builtins/realistic.ts apps/client/src/lib/styles/builtins/realistic.test.ts
git commit -m "feat(styles): realistic style uses subtle orbits + scattered asteroid belts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Full verification + changelog

**Files:** none (verification + changelog delegation)

- [ ] **Step 1: Run the full client test suite**

Run: `pnpm nx test client`
Expected: PASS — all tests green, no regressions in `declarative`, `registry`, or other style tests.

- [ ] **Step 2: Type-check and lint**

Run: `pnpm nx run-many --targets=check` then `pnpm lint`
Expected: PASS — zero type errors, zero lint warnings.

- [ ] **Step 3: Changelog**

Delegate to the `changelog-writer` subagent (per project CLAUDE.md, do not edit `CHANGELOG.md` directly) with a summary: "Realistic style — resting orbit rings softened to alpha 0.1; asteroid belts now render as a deterministic scattered particle field (new optional `regionStyle: 'band' | 'scatter'` in `StyleDefinition`, default `band`, no change to tactical or imported styles)."

- [ ] **Step 4: Commit any changelog change**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for subtle orbits + scattered asteroid belts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** orbit alpha 0.1 (Task 3), scatter data model `regionStyle` (Task 1), seeded scatter rendering with area-scaled capped count + bell bias + size/alpha knobs (Task 2), band default preserved for tactical/imported (Task 1 optional field + Task 2 default branch), all spec tests (Tasks 2-3). Trade-off (zoom scaling) is behaviour-preserving and needs no code.
- **Type consistency:** `RegionStyleSpec`/`RegionStyleKind` defined in Task 1 are imported and used identically in Tasks 2-3; helper names `drawScatterBelt`/`lerpRange` are used only where defined. Palette `region` color `#475569` → `0x475569` matches the test factory.
- **No placeholders:** every code and command step is concrete.
