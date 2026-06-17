# Procedural Realism for the `realistic` Map Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `realistic` map style render a parallax star-field background, glowing spectrally-colored stars, and lit-sphere planets — all procedurally generated at runtime, with `realistic` remaining a pure-JSON shareable style.

**Architecture:** Add a `procedural/` module (seeded noise + cached texture builders), extend the declarative style schema with an optional `'sphere'` shape and a `background` block, teach the declarative renderer to bake `Texture`s via the PIXI `renderer` (threaded through the visual contexts as an optional field), and wire a screen-fixed parallax background container into both map components below the viewport. `tactical` and all imported styles are untouched because every addition is optional.

**Tech Stack:** TypeScript, SvelteKit (Svelte 5 runes), PixiJS v8.18.1, pixi-viewport v6, Vitest + @testing-library/svelte (PIXI mocked per test file), Playwright.

**Spec:** `docs/superpowers/specs/2026-06-17-realistic-procedural-style-design.md`

**Conventions:** tabs for indentation; lines ≤80 chars where practical; no `any`; AAA test structure; descriptive `it("...")` names. Run from `apps/client` unless noted. Use the project's `pixijs` skill / Svelte MCP docs if a PIXI v8 API is unclear before writing renderer code.

---

## File Structure

**New files** (`apps/client/src/lib/styles/procedural/`):
- `noise.ts` — deterministic seeded PRNG. No PIXI dependency.
- `noise.test.ts`
- `textures.ts` — cached `Texture` builders (glow, sphere, nebula, starfield) + `clearTextureCache`. Depends on PIXI `renderer` + `noise`.
- `textures.test.ts`

**Modified files:**
- `src/lib/styles/types.ts` — add `'sphere'` to shape unions, `SurfaceTreatment`, `BackgroundSpec`, `background?` on `StyleDefinition`, `renderer?` on visual contexts, `createBackground` + `parallaxBackground?` on `MapStyle`.
- `src/lib/styles/validate.ts` (+`validate.test.ts`) — accept `'sphere'`, validate optional `background`.
- `src/lib/styles/declarative.ts` (+`declarative.test.ts`) — implement `'sphere'` star/body, `createBackground`, `parallaxBackground`, `BodyType → surface` mapping; thread `renderer`.
- `src/lib/styles/builtins/realistic.ts` — opt into spheres + background.
- `src/lib/components/StarMap.svelte` (+`StarMap.test.ts`) — pass `renderer`, mount/teardown background, parallax on `moved`.
- `src/lib/components/SolarSystemMap.svelte` (+`SolarSystemMap.test.ts`) — same.
- `apps/web-e2e/tests/style-switching.spec.ts` — keep green; add a background-present assertion.

---

## Task 1: Extend style types

**Files:**
- Modify: `src/lib/styles/types.ts`

- [ ] **Step 1: Add `Renderer` to the PIXI import**

Change the top import:

```ts
import type { Container, Graphics, Renderer, TextStyleOptions } from 'pixi.js';
```

- [ ] **Step 2: Widen the shape unions and add a surface type**

Replace the existing `StarShape` / `BodyShape` / `NodeShape` lines:

```ts
export type StarShape = 'disc' | 'ring' | 'gradient' | 'sphere';
export type BodyShape = 'disc' | 'ring' | 'banded' | 'sphere';
export type NodeShape = 'disc' | 'ring';

/** Per-body-type surface treatment for the procedural `'sphere'` shape. */
export type SurfaceTreatment = 'none' | 'bands' | 'mottle';
```

- [ ] **Step 3: Add `BackgroundSpec` and hang it off `StyleDefinition`**

Add near the other spec interfaces (e.g. after `EffectsSpec`):

```ts
/**
 * Procedural parallax star-field background. Baked once per (seed, screen) and
 * drawn behind the viewport. `parallaxFactors` has one entry per layer (far →
 * near, ~0.02..0.1); layers translate by `-cameraCenter * factor` on pan.
 */
export interface BackgroundSpec {
	kind: 'parallax-starfield';
	/** Deterministic seed so every reload/user sees the same field. */
	seed: number;
	/** Relative background-star count multiplier (1 = default). */
	density: number;
	/** Hex blobs painted into the far nebula layer. */
	nebulaColors: string[];
	/** Drift fraction per layer, far → near. */
	parallaxFactors: number[];
}
```

Add the optional field to `StyleDefinition` (after `ui?`):

```ts
	/** Optional procedural background (parallax star field). */
	background?: BackgroundSpec;
```

- [ ] **Step 4: Add `renderer` to the visual contexts**

Add to `StarVisualContext`, `BodyVisualContext`, and `SystemNodeVisualContext`:

```ts
	/** Active PIXI renderer, used to bake procedural textures. Optional so
	 * styles that draw only vector primitives (and unit tests) work without it. */
	renderer?: Renderer;
```

- [ ] **Step 5: Add background methods to `MapStyle`**

Add after `createStageOverlay` in the `MapStyle` interface:

```ts
	/**
	 * Build a screen-space background container (parallax star field) sized to
	 * the canvas, or null when the style has no background. Added BELOW the
	 * viewport. Needs the renderer to bake textures; returns null without one.
	 */
	createBackground(
		screen: { width: number; height: number },
		renderer?: Renderer
	): Container | null;
	/**
	 * Reposition background layers for the current camera center (parallax).
	 * No-op for styles without a background.
	 */
	parallaxBackground?(container: Container, camera: PointLike): void;
```

- [ ] **Step 6: Type-check**

Run: `pnpm exec svelte-check --tsconfig ./tsconfig.json 2>&1 | head -30`
Expected: errors only about `createBackground` missing on the declarative style (implemented in Task 5) — i.e. the types file itself compiles. Other style consumers will be fixed by later tasks.

- [ ] **Step 7: Commit**

```bash
git add src/lib/styles/types.ts
git commit -m "feat(styles): add sphere shape and parallax background to style types"
```

---

## Task 2: Validate the new schema fields

**Files:**
- Modify: `src/lib/styles/validate.ts`
- Test: `src/lib/styles/validate.test.ts`

- [ ] **Step 1: Write failing tests**

Append inside the existing top-level `describe` block in `validate.test.ts` (it imports `validateStyleDefinition` and has a `valid()` helper that returns a known-good definition object — reuse it):

```ts
	it('accepts the sphere shape for stars and bodies', () => {
		const input = valid();
		input.star.shape = 'sphere';
		input.body.shape = 'sphere';
		const result = validateStyleDefinition(input);
		expect(result.ok).toBe(true);
	});

	it('accepts a valid parallax-starfield background', () => {
		const input = valid();
		input.background = {
			kind: 'parallax-starfield',
			seed: 7,
			density: 1,
			nebulaColors: ['#3a1d0e', '#1d2a3a'],
			parallaxFactors: [0.02, 0.1]
		};
		const result = validateStyleDefinition(input);
		expect(result.ok).toBe(true);
	});

	it('still accepts a definition with no background block', () => {
		const input = valid();
		delete (input as { background?: unknown }).background;
		expect(validateStyleDefinition(input).ok).toBe(true);
	});

	it('rejects a background with an unknown kind', () => {
		const input = valid();
		input.background = {
			kind: 'rainbow',
			seed: 1,
			density: 1,
			nebulaColors: ['#000000'],
			parallaxFactors: [0.1]
		};
		const result = validateStyleDefinition(input);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('background.kind');
	});

	it('rejects a background whose nebulaColors are not hex', () => {
		const input = valid();
		input.background = {
			kind: 'parallax-starfield',
			seed: 1,
			density: 1,
			nebulaColors: ['not-a-color'],
			parallaxFactors: [0.1]
		};
		const result = validateStyleDefinition(input);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('background.nebulaColors');
	});
```

> If `valid()` does not already exist in the file, add this helper above the
> `describe` block, populated from the realistic shape:
> ```ts
> function valid(): Record<string, unknown> { /* a known-good StyleDefinition */ }
> ```
> Inspect the top of `validate.test.ts` first; the existing positive test already
> builds a valid object — extract it into `valid()` if needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/styles/validate.test.ts`
Expected: FAIL — `'sphere'` rejected by `oneOf`, and `background` is ignored/unvalidated.

- [ ] **Step 3: Accept `'sphere'` in the shape lists**

In `validate.ts` update the shape arrays:

```ts
const STAR_SHAPES: readonly StarShape[] = ['disc', 'ring', 'gradient', 'sphere'];
const BODY_SHAPES: readonly BodyShape[] = ['disc', 'ring', 'banded', 'sphere'];
const NODE_SHAPES: readonly NodeShape[] = ['disc', 'ring'];
```

- [ ] **Step 4: Add a `background` validator and call it**

Add this helper after the `glow` helper:

```ts
function hexArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		fail(path, 'must be a non-empty array');
	}
	return (value as unknown[]).map((c, i) => hex(c, `${path}[${i}]`));
}

function numArray(value: unknown, path: string): number[] {
	if (!Array.isArray(value) || value.length === 0) {
		fail(path, 'must be a non-empty array');
	}
	return (value as unknown[]).map((n, i) => num(n, `${path}[${i}]`));
}

function background(value: unknown, path: string) {
	if (value === undefined) return undefined;
	const r = asRecord(value, path);
	return {
		kind: oneOf(r.kind, ['parallax-starfield'] as const, `${path}.kind`),
		seed: num(r.seed, `${path}.seed`),
		density: num(r.density, `${path}.density`),
		nebulaColors: hexArray(r.nebulaColors, `${path}.nebulaColors`),
		parallaxFactors: numArray(r.parallaxFactors, `${path}.parallaxFactors`)
	};
}
```

In `parse`, just before `return result;` (or before the trailing `effects`
block — order does not matter), add:

```ts
	if (root.background !== undefined) {
		result.background = background(root.background, 'background');
	}
```

> `hex` returns the `#RRGGBB` string already validated by `HEX_RE`; `background`
> returns a fully-typed `BackgroundSpec`. Import `BackgroundSpec` is not needed
> because `result` is typed `StyleDefinition` and the field is structurally
> assignable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/styles/validate.test.ts`
Expected: PASS (all new + existing cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/styles/validate.ts src/lib/styles/validate.test.ts
git commit -m "feat(styles): validate sphere shape and parallax background"
```

---

## Task 3: Seeded noise / PRNG

**Files:**
- Create: `src/lib/styles/procedural/noise.ts`
- Test: `src/lib/styles/procedural/noise.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createRng } from './noise';

describe('createRng', () => {
	it('produces the same sequence for the same seed', () => {
		const a = createRng(42);
		const b = createRng(42);
		const seqA = [a(), a(), a(), a()];
		const seqB = [b(), b(), b(), b()];
		expect(seqA).toEqual(seqB);
	});

	it('produces different sequences for different seeds', () => {
		const a = createRng(1);
		const b = createRng(2);
		expect([a(), a()]).not.toEqual([b(), b()]);
	});

	it('returns values in the half-open range [0, 1)', () => {
		const rng = createRng(99);
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/styles/procedural/noise.test.ts`
Expected: FAIL — `Cannot find module './noise'`.

- [ ] **Step 3: Implement the PRNG**

Create `noise.ts`:

```ts
/**
 * Deterministic pseudo-random generator (mulberry32). Returns a function that
 * yields the next value in [0, 1). The same seed always produces the same
 * sequence, so procedural star fields are stable across reloads and users.
 * Time complexity: O(1) per call.
 */
export function createRng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/styles/procedural/noise.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/styles/procedural/noise.ts src/lib/styles/procedural/noise.test.ts
git commit -m "feat(styles): add deterministic seeded PRNG for procedural textures"
```

---

## Task 4: Cached procedural texture builders

**Files:**
- Create: `src/lib/styles/procedural/textures.ts`
- Test: `src/lib/styles/procedural/textures.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PIXI: Graphics/Container record draw calls; generateTexture returns a
// fresh sentinel object each call so we can prove the cache reuses instances.
vi.mock('pixi.js', () => {
	class Graphics {
		circle() {
			return this;
		}
		rect() {
			return this;
		}
		fill() {
			return this;
		}
	}
	class Container {
		children: unknown[] = [];
		addChild(c: unknown) {
			this.children.push(c);
			return c;
		}
	}
	class Texture {}
	return { Graphics, Container, Texture };
});

import {
	buildStarGlow,
	buildSphere,
	buildNebulaLayer,
	buildStarfieldLayer,
	clearTextureCache
} from './textures';

function fakeRenderer() {
	return { generateTexture: vi.fn(() => ({})) };
}

describe('procedural textures', () => {
	beforeEach(() => clearTextureCache());

	it('bakes a star glow texture via the renderer', () => {
		const r = fakeRenderer();
		const tex = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(tex).toBeDefined();
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
	});

	it('caches by params: identical params reuse the texture, changed params rebake', () => {
		const r = fakeRenderer();
		const a = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		const b = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(b).toBe(a);
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
		buildStarGlow(r as never, { color: 0x00ff00, radius: 10, alpha: 0.3 });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});

	it('bakes a banded sphere from a multi-layer container', () => {
		const r = fakeRenderer();
		buildSphere(r as never, {
			radius: 8,
			color: 0x3366ff,
			surface: 'bands',
			lightAngle: 0.6,
			seed: 3
		});
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
	});

	it('bakes nebula and starfield layers deterministically (no rebake on identical params)', () => {
		const r = fakeRenderer();
		buildNebulaLayer(r as never, { size: 512, seed: 1, colors: [0x112233], blobCount: 4 });
		buildNebulaLayer(r as never, { size: 512, seed: 1, colors: [0x112233], blobCount: 4 });
		buildStarfieldLayer(r as never, { size: 512, seed: 2, count: 50, tint: 0xffffff });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});

	it('clearTextureCache forces a rebake', () => {
		const r = fakeRenderer();
		buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		clearTextureCache();
		buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/styles/procedural/textures.test.ts`
Expected: FAIL — `Cannot find module './textures'`.

- [ ] **Step 3: Implement the builders**

Create `textures.ts`:

```ts
import { Container, Graphics } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';
import { createRng } from './noise';
import type { SurfaceTreatment } from '../types';

const cache = new Map<string, Texture>();

/** Clear the baked-texture cache (teardown / tests). */
export function clearTextureCache(): void {
	cache.clear();
}

function memo(key: string, build: () => Texture): Texture {
	const hit = cache.get(key);
	if (hit) return hit;
	const tex = build();
	cache.set(key, tex);
	return tex;
}

/** Blend a 0xRRGGBB color toward white (t>0) or black (t<0) by |t| in 0..1. */
function shade(color: number, t: number): number {
	const target = t >= 0 ? 255 : 0;
	const amt = Math.abs(t);
	const ch = (c: number) => Math.round(c + (target - c) * amt);
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	return (ch(r) << 16) | (ch(g) << 8) | ch(b);
}

/** Soft radial corona baked once. `radius` is the outer glow radius. */
export function buildStarGlow(
	renderer: Renderer,
	p: { color: number; radius: number; alpha: number }
): Texture {
	return memo(`glow:${p.color}:${p.radius}:${p.alpha}`, () => {
		const g = new Graphics();
		const steps = 8;
		for (let i = steps; i >= 1; i--) {
			const r = (p.radius * i) / steps;
			// Fainter at the rim, denser toward the core.
			const a = p.alpha * ((steps - i + 1) / steps) * 0.5;
			g.circle(p.radius, p.radius, r).fill({ color: p.color, alpha: a });
		}
		return renderer.generateTexture(g);
	});
}

/**
 * Lit sphere with a day/night terminator: concentric discs from a near-black
 * limb to a bright core, each inner disc shifted toward `lightAngle`. Optional
 * surface treatment adds gas-giant bands or rocky mottling.
 */
export function buildSphere(
	renderer: Renderer,
	p: {
		radius: number;
		color: number;
		surface: SurfaceTreatment;
		lightAngle: number;
		seed: number;
	}
): Texture {
	return memo(
		`sphere:${p.color}:${p.radius}:${p.surface}:${p.lightAngle.toFixed(2)}:${p.seed}`,
		() => {
			const r = p.radius;
			const cont = new Container();
			const limb = shade(p.color, -0.85);
			const steps = 10;
			for (let i = 0; i < steps; i++) {
				const t = i / (steps - 1); // 0 = outer limb, 1 = lit core
				const rad = r * (1 - t * 0.85);
				const off = t * r * 0.45;
				const cx = r + Math.cos(p.lightAngle) * off;
				const cy = r - Math.sin(p.lightAngle) * off;
				const tint = shade(limb, t); // limb → toward base color/white
				const color = i === 0 ? limb : shade(p.color, (t - 0.5) * 0.6);
				const g = new Graphics();
				g.circle(cx, cy, rad).fill({ color: i === 0 ? tint : color, alpha: 1 });
				cont.addChild(g);
			}
			if (p.surface === 'bands') {
				const bands = new Graphics();
				for (let b = -2; b <= 2; b++) {
					const y = r + (b * r) / 3;
					bands.rect(0, y - r * 0.08, r * 2, r * 0.16);
				}
				bands.fill({ color: shade(p.color, -0.4), alpha: 0.25 });
				cont.addChild(bands);
			} else if (p.surface === 'mottle') {
				const rng = createRng(p.seed);
				const dots = new Graphics();
				for (let d = 0; d < 14; d++) {
					const dx = r + (rng() - 0.5) * r * 1.4;
					const dy = r + (rng() - 0.5) * r * 1.4;
					dots.circle(dx, dy, r * (0.08 + rng() * 0.12));
				}
				dots.fill({ color: shade(p.color, -0.3), alpha: 0.18 });
				cont.addChild(dots);
			}
			return renderer.generateTexture(cont);
		}
	);
}

/** Far nebula layer: a few large soft colored blobs over transparency. */
export function buildNebulaLayer(
	renderer: Renderer,
	p: { size: number; seed: number; colors: number[]; blobCount: number }
): Texture {
	return memo(
		`nebula:${p.size}:${p.seed}:${p.colors.join(',')}:${p.blobCount}`,
		() => {
			const rng = createRng(p.seed);
			const g = new Graphics();
			for (let i = 0; i < p.blobCount; i++) {
				const x = rng() * p.size;
				const y = rng() * p.size;
				const rad = p.size * (0.15 + rng() * 0.25);
				const color = p.colors[Math.floor(rng() * p.colors.length)];
				for (let j = 4; j >= 1; j--) {
					g.circle(x, y, (rad * j) / 4).fill({ color, alpha: 0.05 });
				}
			}
			return renderer.generateTexture(g);
		}
	);
}

/** Scattered background stars of varying brightness over transparency. */
export function buildStarfieldLayer(
	renderer: Renderer,
	p: { size: number; seed: number; count: number; tint: number }
): Texture {
	return memo(`stars:${p.size}:${p.seed}:${p.count}:${p.tint}`, () => {
		const rng = createRng(p.seed);
		const g = new Graphics();
		for (let i = 0; i < p.count; i++) {
			const x = rng() * p.size;
			const y = rng() * p.size;
			const brightness = rng();
			g.circle(x, y, 0.5 + brightness * 1.5).fill({
				color: p.tint,
				alpha: 0.3 + brightness * 0.7
			});
		}
		return renderer.generateTexture(g);
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/styles/procedural/textures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/styles/procedural/textures.ts src/lib/styles/procedural/textures.test.ts
git commit -m "feat(styles): add cached procedural texture builders"
```

---

## Task 5: Sphere rendering + background in the declarative renderer

**Files:**
- Modify: `src/lib/styles/declarative.ts`
- Test: `src/lib/styles/declarative.test.ts`

- [ ] **Step 1: Write failing tests**

In `declarative.test.ts`, extend the PIXI mock to add `Sprite` and a positionable
container, then add cases. Update the `vi.mock('pixi.js', ...)` factory so the
returned object includes `Sprite` and `Container` exposes `position`/`eventMode`:

Add inside the mock factory, alongside `Graphics`/`Container`:

```ts
		class Sprite {
			anchor = { set: () => {} };
			texture: unknown;
			constructor(texture: unknown) {
				this.texture = texture;
			}
		}
```

Change the `Container` class in the mock to include position state:

```ts
		class Container {
			children: unknown[] = [];
			eventMode = 'auto';
			interactiveChildren = true;
			position = {
				x: 0,
				y: 0,
				set(x: number, y: number) {
					this.x = x;
					this.y = y;
				}
			};
			onRender: (() => void) | undefined;
			addChild(c: unknown) {
				this.children.push(c);
				return c;
			}
		}
```

And return `Sprite` from the factory: `return { Graphics, Container, Sprite };`

Add a fake renderer helper near the top of the test file (after imports):

```ts
const fakeRenderer = () => ({ generateTexture: () => ({}) }) as never;
```

Then add these tests inside the `describe('createDeclarativeStyle', ...)` block:

```ts
	it('renders a sphere star with a glow + body sprite when a renderer is given', () => {
		const style = createDeclarativeStyle(def({ star: { shape: 'sphere' } }));
		const visual = style.createStarVisual({
			star: star('G2V'),
			baseRadius: 10,
			renderer: fakeRenderer()
		}) as unknown as { children: unknown[] };
		// One corona sprite + one sphere sprite.
		expect(visual.children.length).toBe(2);
	});

	it('falls back to vector drawing for a sphere star with no renderer', () => {
		const style = createDeclarativeStyle(def({ star: { shape: 'sphere' } }));
		const visual = style.createStarVisual({
			star: star('G2V'),
			baseRadius: 10
		}) as unknown as { children: Array<{ fills?: unknown[] }> };
		// Vector fallback draws Graphics (which expose `fills`), not Sprites.
		expect(visual.children.some((c) => Array.isArray(c.fills))).toBe(true);
	});

	it('returns null from createBackground when the style has no background', () => {
		const style = createDeclarativeStyle(def());
		expect(style.createBackground({ width: 800, height: 600 }, fakeRenderer())).toBeNull();
	});

	it('builds one layer per parallax factor when a background is configured', () => {
		const style = createDeclarativeStyle(
			def({
				background: {
					kind: 'parallax-starfield',
					seed: 1,
					density: 1,
					nebulaColors: ['#112233'],
					parallaxFactors: [0.02, 0.05, 0.1]
				}
			})
		);
		const bg = style.createBackground(
			{ width: 800, height: 600 },
			fakeRenderer()
		) as unknown as { children: unknown[] };
		expect(bg).not.toBeNull();
		expect(bg.children.length).toBe(3);
	});

	it('returns null from createBackground without a renderer', () => {
		const style = createDeclarativeStyle(
			def({
				background: {
					kind: 'parallax-starfield',
					seed: 1,
					density: 1,
					nebulaColors: ['#112233'],
					parallaxFactors: [0.1]
				}
			})
		);
		expect(style.createBackground({ width: 800, height: 600 })).toBeNull();
	});

	it('parallaxBackground offsets each layer by camera * factor', () => {
		const style = createDeclarativeStyle(
			def({
				background: {
					kind: 'parallax-starfield',
					seed: 1,
					density: 1,
					nebulaColors: ['#112233'],
					parallaxFactors: [0.1, 0.5]
				}
			})
		);
		const bg = style.createBackground(
			{ width: 800, height: 600 },
			fakeRenderer()
		) as unknown as { children: Array<{ position: { x: number; y: number } }> };
		style.parallaxBackground!(bg as never, { x: 100, y: 200 });
		expect(bg.children[0].position).toMatchObject({ x: -10, y: -20 });
		expect(bg.children[1].position).toMatchObject({ x: -50, y: -100 });
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/styles/declarative.test.ts`
Expected: FAIL — `createBackground` is not a function; sphere path not implemented.

- [ ] **Step 3: Implement sphere + background in `declarative.ts`**

Update the PIXI import line:

```ts
import { Container, Graphics, Sprite } from 'pixi.js';
import type { Renderer, TextStyleOptions } from 'pixi.js';
```

Add to the type imports from `./types`: `SurfaceTreatment`, `BodyShape` (already
imported). Add new imports below the existing ones:

```ts
import { hexToNumber, resolveSpectralColor, resolveBodyColor } from './palette';
import {
	buildStarGlow,
	buildSphere,
	buildNebulaLayer,
	buildStarfieldLayer
} from './procedural/textures';
import type { BodyType } from '$lib/types/stellar';
```

Add a body-type → surface map and a sprite helper near the top (after `lighten`):

```ts
const BODY_SURFACE: Record<BodyType, SurfaceTreatment> = {
	Planet: 'bands',
	DwarfPlanet: 'mottle',
	Moon: 'mottle',
	SpaceStation: 'none',
	Comet: 'none'
};

/** Add a centered sprite for a baked texture to a visual container. */
function addSprite(visual: Container, texture: ReturnType<Renderer['generateTexture']>): void {
	const sprite = new Sprite(texture);
	sprite.anchor.set(0.5);
	visual.addChild(sprite);
}
```

Replace `createStarVisual` with:

```ts
		createStarVisual({ star, baseRadius, renderer }: StarVisualContext): Container {
			const visual = new Container();
			const color = resolveSpectralColor(def.palette.spectral, star.SpectralClass);
			if (def.star.shape === 'sphere' && renderer) {
				const glowRadius = baseRadius * (def.star.glow?.radiusFactor ?? 2.6);
				addSprite(
					visual,
					buildStarGlow(renderer, {
						color,
						radius: glowRadius,
						alpha: def.star.glow?.alpha ?? 0.3
					})
				);
				addSprite(
					visual,
					buildSphere(renderer, {
						radius: baseRadius,
						color: lighten(color, 0.3),
						surface: 'none',
						lightAngle: 0,
						seed: 1
					})
				);
				return visual;
			}
			addGlow(visual, baseRadius, color, def.star.glow);
			drawStarShape(visual, fallbackStarShape(def.star.shape), baseRadius, color);
			return visual;
		},
```

Replace `createBodyVisual` with:

```ts
		createBodyVisual({ body, baseRadius, renderer }: BodyVisualContext): Container {
			const visual = new Container();
			const color = resolveBodyColor(def.palette.body, body.BodyType);
			if (def.body.shape === 'sphere' && renderer) {
				addGlow(visual, baseRadius, color, def.body.glow);
				addSprite(
					visual,
					buildSphere(renderer, {
						radius: baseRadius,
						color,
						surface: BODY_SURFACE[body.BodyType] ?? 'none',
						lightAngle: 2.2,
						seed: hashId(body.Id)
					})
				);
				return visual;
			}
			addGlow(visual, baseRadius, color, def.body.glow);
			drawBodyShape(visual, fallbackBodyShape(def.body.shape), baseRadius, color);
			return visual;
		},
```

Add the small helpers used above (after `drawNodeShape`):

```ts
/** When a renderer is unavailable, sphere degrades to the nearest vector look. */
function fallbackStarShape(shape: StarShape): StarShape {
	return shape === 'sphere' ? 'gradient' : shape;
}

function fallbackBodyShape(shape: BodyShape): BodyShape {
	return shape === 'sphere' ? 'disc' : shape;
}

/** Stable small integer seed from an id string (so mottling is deterministic). */
function hashId(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	}
	return h >>> 0;
}
```

Update `createSystemNodeVisual`'s context destructuring to accept `renderer`
(unused today, but keeps the contract uniform) — change its signature to
`({ baseRadius }: SystemNodeVisualContext)` is fine as-is since `renderer` is
optional; leave it unchanged.

Add `createBackground` and `parallaxBackground` to the returned object, after
`createStageOverlay`:

```ts
		createBackground(screen, renderer): Container | null {
			const bg = def.background;
			if (!bg || !renderer) return null;
			const root = new Container();
			root.eventMode = 'none';
			root.interactiveChildren = false;
			const size = Math.max(screen.width, screen.height) * 1.6;
			const nebulaColors = bg.nebulaColors.map(hexToNumber);
			bg.parallaxFactors.forEach((_factor, i) => {
				const layer = new Container();
				layer.eventMode = 'none';
				if (i === 0) {
					const neb = new Sprite(
						buildNebulaLayer(renderer, {
							size,
							seed: bg.seed + i,
							colors: nebulaColors,
							blobCount: 6
						})
					);
					layer.addChild(neb);
				}
				const stars = new Sprite(
					buildStarfieldLayer(renderer, {
						size,
						seed: bg.seed + 100 + i,
						count: Math.round((bg.density * 500) / (i + 1)),
						tint: 0xffffff
					})
				);
				layer.addChild(stars);
				root.addChild(layer);
			});
			return root;
		},

		parallaxBackground(container, camera): void {
			const bg = def.background;
			if (!bg) return;
			container.children.forEach((child, i) => {
				const factor = bg.parallaxFactors[i] ?? 0;
				(child as Container).position.set(-camera.x * factor, -camera.y * factor);
			});
		}
```

> Note: `createStarVisual`'s context already destructures `renderer`. Ensure the
> `StarVisualContext`/`BodyVisualContext` imports are present (they are).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/styles/declarative.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/styles/declarative.ts src/lib/styles/declarative.test.ts
git commit -m "feat(styles): render sphere stars/bodies and parallax background"
```

---

## Task 6: Opt the realistic built-in into spheres + background

**Files:**
- Modify: `src/lib/styles/builtins/realistic.ts`

- [ ] **Step 1: Update the star/body shapes and add the background**

In `realistic.ts`, change the `star`, `body`, and `systemNode` lines and add a
`background` block (place `background` after the `ui` block):

```ts
	// Spectrally-colored sphere with a strong coronal glow.
	star: { shape: 'sphere', glow: { radiusFactor: 2.8, alpha: 0.35 } },
	// Lit sphere with terminator; gas-giant bands / rocky mottling by type.
	body: { shape: 'sphere', glow: { radiusFactor: 1.4, alpha: 0.16 } },
	// Glowing amber cluster dots (unchanged).
	systemNode: { shape: 'disc', glow: { radiusFactor: 2.4, alpha: 0.35 } },
```

Add after the closing `}` of the `ui` block (still inside the object literal):

```ts
	// Procedural parallax star field behind the maps. Warm Coriolis nebula
	// tones; three layers drift at increasing speed for depth.
	background: {
		kind: 'parallax-starfield',
		seed: 1337,
		density: 1,
		nebulaColors: ['#3a1d0e', '#241a33', '#1d2a3a'],
		parallaxFactors: [0.02, 0.05, 0.1]
	}
```

- [ ] **Step 2: Verify the built-in still validates and seeds**

Run: `pnpm exec vitest run src/lib/styles/registry.test.ts src/lib/stores/style.test.ts 2>&1 | tail -20`
Expected: PASS (built-ins seed without error). If `stores/style.test.ts` does
not exist, run only `registry.test.ts`.

- [ ] **Step 3: Type-check**

Run: `pnpm exec svelte-check --tsconfig ./tsconfig.json 2>&1 | grep -i "realistic\|background\|sphere" | head`
Expected: no errors referencing these.

- [ ] **Step 4: Commit**

```bash
git add src/lib/styles/builtins/realistic.ts
git commit -m "feat(styles): give realistic style sphere bodies and a parallax star field"
```

---

## Task 7: Wire renderer + parallax background into StarMap

**Files:**
- Modify: `src/lib/components/StarMap.svelte`
- Test: `src/lib/components/StarMap.test.ts`

- [ ] **Step 1: Write a failing component test**

Open `StarMap.test.ts` and inspect how the active style is mocked (it already
imports from `$lib/stores/style`). Add a test that asserts the component mounts a
background below the viewport when the style provides one. Mirror the existing
mock setup in that file; add a `createBackground` spy to the mocked style object.
Concretely, ensure the mocked `activeStyle` store value includes:

```ts
	createBackground: vi.fn(() => null),
	parallaxBackground: vi.fn()
```

Then add:

```ts
	it('asks the active style for a background on mount', async () => {
		// Arrange + Act: render the component (reuse the file's existing render
		// helper / fixture setup).
		await renderStarMap();
		// Assert: the style was consulted for a background.
		expect(activeStyleValue.createBackground).toHaveBeenCalled();
	});
```

> Adapt `renderStarMap()` / `activeStyleValue` to the helpers already present in
> the file. If the file mocks PIXI such that `app.renderer` is undefined, have the
> mock expose a minimal `renderer: { generateTexture: vi.fn(() => ({})) }` and
> `stage.addChildAt: vi.fn()` so `rebuildStyleBackground` runs without throwing.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/components/StarMap.test.ts`
Expected: FAIL — `createBackground` never called (not yet wired).

- [ ] **Step 3: Add background state + lifecycle**

In `StarMap.svelte`, near `let styleOverlay` (around line 56) add:

```ts
	// Screen-space parallax background owned by the active style (below viewport).
	let styleBackground: PIXI.Container | null = null;
```

After the `rebuildStyleOverlay` function (around line 213) add:

```ts
	/** Rebuild the screen-fixed parallax background beneath the viewport. */
	function rebuildStyleBackground() {
		if (!app) return;
		if (styleBackground) {
			styleBackground.destroy({ children: true });
			styleBackground = null;
		}
		const bg = $activeStyle.createBackground(
			{ width: app.screen.width, height: app.screen.height },
			app.renderer
		);
		if (bg) {
			app.stage.addChildAt(bg, 0); // below the viewport (index 0)
			styleBackground = bg;
			applyParallax();
		}
	}

	/** Offset the background layers for the current camera (parallax). */
	function applyParallax() {
		if (!styleBackground || !viewport) return;
		$activeStyle.parallaxBackground?.(styleBackground, {
			x: viewport.center.x,
			y: viewport.center.y
		});
	}
```

In `applyStyleChrome` (around line 216), add a call to rebuild the background:

```ts
	function applyStyleChrome() {
		if (!app) return;
		app.renderer.background.color = $activeStyle.colors.background;
		rebuildStyleBackground();
		rebuildStyleOverlay();
	}
```

In the resize callback passed to `setupPixi` (around line 71-74), also rebuild the
background so it always covers the canvas:

```ts
				() => {
					updateZoomLimits();
					rebuildStyleBackground();
					rebuildStyleOverlay();
				}
```

Wire parallax to camera movement. Change the existing moved handler
(line 91 `setup.viewport.on('moved', updateScales);`) to:

```ts
				setup.viewport.on('moved', () => {
					updateScales();
					applyParallax();
				});
```

> Teardown: the existing `onDestroy` calls `app.destroy(true, { children: true,
> texture: true })`, which destroys the viewport (removing its `moved` listener)
> and the background container. No separate listener removal is needed because the
> handler lives on the viewport, not on a longer-lived emitter.

- [ ] **Step 4: Pass the renderer into the system-node visual**

At the `createSystemNodeVisual` call (around line 465) add `renderer`:

```ts
			node.addChild(
				$activeStyle.createSystemNodeVisual({ system, baseRadius: 10, renderer: app.renderer })
			);
```

- [ ] **Step 5: Run test + full component suite to verify pass**

Run: `pnpm exec vitest run src/lib/components/StarMap.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/StarMap.svelte src/lib/components/StarMap.test.ts
git commit -m "feat(starmap): mount parallax background and pass renderer to visuals"
```

---

## Task 8: Wire renderer + parallax background into SolarSystemMap

**Files:**
- Modify: `src/lib/components/SolarSystemMap.svelte`
- Test: `src/lib/components/SolarSystemMap.test.ts`

- [ ] **Step 1: Write a failing component test**

Mirror Task 7 Step 1 in `SolarSystemMap.test.ts`: add `createBackground`/
`parallaxBackground` to the mocked style and assert `createBackground` is called
on render, using the file's existing render/fixture helpers.

```ts
	it('asks the active style for a background on mount', async () => {
		await renderSolarSystemMap();
		expect(activeStyleValue.createBackground).toHaveBeenCalled();
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/components/SolarSystemMap.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add background state + lifecycle**

In `SolarSystemMap.svelte`, near `let styleOverlay` (line 78) add:

```ts
	let styleBackground: PIXI.Container | null = null;
```

After `rebuildStyleOverlay` (around line 180) add the same two functions as
StarMap (identical bodies):

```ts
	function rebuildStyleBackground() {
		if (!app) return;
		if (styleBackground) {
			styleBackground.destroy({ children: true });
			styleBackground = null;
		}
		const bg = $activeStyle.createBackground(
			{ width: app.screen.width, height: app.screen.height },
			app.renderer
		);
		if (bg) {
			app.stage.addChildAt(bg, 0);
			styleBackground = bg;
			applyParallax();
		}
	}

	function applyParallax() {
		if (!styleBackground || !viewport) return;
		$activeStyle.parallaxBackground?.(styleBackground, {
			x: viewport.center.x,
			y: viewport.center.y
		});
	}
```

In `applyStyleChrome` (line 182) add `rebuildStyleBackground();` before
`rebuildStyleOverlay();`. In the `setupPixi` resize callback (around line 95) add
`rebuildStyleBackground();` next to the existing `rebuildStyleOverlay();`.

Find the viewport `moved` handler in this component (search for
`viewport.on('moved'`); if present, add `applyParallax();` to it; if the system
map has no `moved` handler, add one in `onMount` after the viewport is created:

```ts
			setup.viewport.on('moved', applyParallax);
```

- [ ] **Step 4: Pass the renderer into the star and body visuals**

At the `createStarVisual` call (around line 543):

```ts
		starVisual.addChild($activeStyle.createStarVisual({ star, baseRadius, renderer: app.renderer }));
```

At the `createBodyVisual` call (around line 657):

```ts
		bodyVisual.addChild($activeStyle.createBodyVisual({ body, baseRadius, renderer: app.renderer }));
```

- [ ] **Step 5: Run test + suite to verify pass**

Run: `pnpm exec vitest run src/lib/components/SolarSystemMap.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/SolarSystemMap.svelte src/lib/components/SolarSystemMap.test.ts
git commit -m "feat(systemmap): mount parallax background and pass renderer to visuals"
```

---

## Task 9: E2E guard + full verification

**Files:**
- Modify: `apps/web-e2e/tests/style-switching.spec.ts`

- [ ] **Step 1: Confirm existing e2e specs still describe valid behavior**

The new schema fields are optional and the realistic chrome (`--slate-900` =
`15 23 42`, `--sky-500` = `245 158 11`, tactical `--slate-900` = `6 25 15`,
mono font) is unchanged. No edits to those assertions are required.

- [ ] **Step 2: Run unit + component suite**

Run (from `apps/client`): `pnpm exec vitest run`
Expected: PASS — all style, procedural, and component tests green.

- [ ] **Step 3: Type-check and lint**

Run (from repo root):
```bash
pnpm nx run-many --targets=check && pnpm lint
```
Expected: zero errors, zero warnings. Fix any `any`/line-length/format issues in
the files touched by this plan.

- [ ] **Step 4: Run e2e**

Run (from repo root): `pnpm nx e2e web-e2e`
Expected: style-switch / persistence / import specs PASS (the build must succeed
with the new background code path).

- [ ] **Step 5: Manual visual check**

Run: `pnpm nx serve client`, open a cluster, then:
- Confirm a star field with faint nebula is visible behind the cluster and that
  it drifts slightly (parallax) as you pan.
- Open a system: stars glow and are colored by class; planets read as lit
  spheres (gas-banded for `Planet`, mottled for moons/dwarfs).
- Switch to **Tactical CRT** and back: the background appears only on realistic
  and is torn down cleanly (no leftover sprites, no perf drop).
- Export the realistic style, re-import the file: it still renders (shareable
  contract intact).

- [ ] **Step 6: Delegate the changelog entry**

Per project convention, dispatch the `changelog-writer` subagent to append an
entry summarizing the procedural realism upgrade. Do not edit `CHANGELOG.md`
directly.

- [ ] **Step 7: Final commit (if any lint/format fixups were made)**

```bash
git add -A
git commit -m "chore(styles): lint/format fixups for procedural realism"
```

---

## Self-Review Notes (author)

- **Spec coverage:** procedural module (Tasks 3-4) ✓; sphere fidelity + glow
  (Task 5-6) ✓; parallax background (Tasks 5, 7, 8) ✓; optional schema +
  validator back-compat (Tasks 1-2) ✓; renderer threaded as optional with vector
  fallback (Tasks 1, 5) ✓; tactical untouched (no task modifies it) ✓; teardown
  of background + listener via `app.destroy` (Tasks 7-8 notes) ✓; tests at every
  layer (every task) ✓; manual + e2e verification (Task 9) ✓.
- **Type consistency:** `buildStarGlow/buildSphere/buildNebulaLayer/`
  `buildStarfieldLayer/clearTextureCache`, `createRng`, `createBackground`,
  `parallaxBackground`, `BODY_SURFACE`, `SurfaceTreatment`, `BackgroundSpec` are
  named identically across definition, implementation, and tests.
- **No placeholders:** every code step shows full code; component-test steps
  point to existing in-file helpers because those helpers differ per file and
  must be reused rather than reinvented (the adaptation instructions are explicit
  about what to add).
