# Procedural realism for the `realistic` map style

## Context

The `realistic` built-in style currently renders the cluster and system maps with
flat procedural `Graphics`: discs, a faked "gradient" core (base disc + lighter
inner disc), banded gas giants, and a stepped concentric-disc glow. The
background is a single flat fill color. The look reads as "warm gold dots on
black," not as a star field with believable stars and planets.

The goal: make `realistic` look much closer to the Coriolis "Third Horizon"
reference maps — a star-field background with depth, stars that glow and are
colored by spectral class, and planets that read as lit spheres — **as
inspiration, not a copy** (the reference art is copyrighted and is not reused).

### Decisions already made (binding constraints)

- **Procedural textures, no binary assets.** All new visuals are generated at
  runtime. `realistic` therefore **stays a pure-JSON, shareable
  `StyleDefinition`** — it can still be exported, forked, and imported with no
  code execution. This preserves the headline property of the style system.
- **Fidelity: shaded spheres + glow.** Stars = bright (limb-darkened) core +
  soft radial corona, OBAFGKM-tinted. Planets = lit sphere with a day/night
  terminator plus a subtle per-type surface treatment (gas-giant bands, rocky
  mottling). Not full photoreal procedural surfaces.
- **Background: parallax star field.** A baked nebula + star-field, in 2–3
  layers that drift by a fraction of the camera pan to give depth.
- **`tactical` is untouched.** This is a `realistic`-only upgrade. All new
  capabilities are *optional* schema additions so `tactical` and any imported
  style keep working unchanged.

### Starting facts

- PixiJS `^8.18.1`; `pixi-viewport` `^6.0.3`.
- Maps today are 100% `Graphics`. No `Texture`/`Sprite`/`Filter`/asset pipeline
  exists. No static image assets beyond logos.
- The style system separates **appearance** (styles) from **layout / camera /
  interaction** (components). That separation is preserved here.

## Rendering principle

All new visuals use **gradient fills (`FillGradient`) and textures baked with
`renderer.generateTexture(...)` — no custom GL shaders.** This keeps the renderer
behaving identically on WebGL and WebGPU (the existing `effects/` layer made the
same choice deliberately) and keeps the logic unit-testable. Baked textures are
**cached by a parameter key** and produced once per `(style, seed, params)`, so
panning and zooming never rebake. A fixed `seed` lives in the style definition,
so the star field is deterministic: identical across reloads and identical for
every user who imports the style.

## Architecture

### New module: `apps/client/src/lib/styles/procedural/`

Pure, framework-light helpers with no Svelte/store coupling.

- **`noise.ts`** — a small seeded value-noise / PRNG helper. Deterministic given
  a seed. Used to place background stars and to mottle planet surfaces.
  - `createRng(seed: number): () => number` — deterministic 0..1 generator.
  - `valueNoise2D(...)` if needed for mottling; otherwise scattered-dot noise is
    enough and cheaper. Keep it minimal (YAGNI).
- **`textures.ts`** — texture builders. Each takes the PIXI `renderer` plus typed
  params and returns a `Texture`. Each is wrapped by a cache keyed on a stable
  string of its params so repeated calls are free.
  - `buildStarGlow(renderer, { color, radius, alpha, falloff }): Texture` —
    layered radial-gradient corona, baked once.
  - `buildSphere(renderer, { radius, color, lightDir, surface }): Texture` —
    radial gradient whose bright center is offset toward `lightDir` and which
    darkens to a limb, producing a lit sphere with a terminator. `surface`
    selects a treatment: `'bands'` (gas giant — horizontal darker bands),
    `'mottle'` (rocky — scattered faint blotches), or `'none'`.
  - `buildNebulaLayer(renderer, { size, seed, colors, density }): Texture` —
    a few large soft radial gradient blobs in the nebula colors over transparency.
  - `buildStarfieldLayer(renderer, { size, seed, density, tint }): Texture` —
    scattered points of varying brightness/size over transparency.
  - A `clearTextureCache()` for teardown / tests.

### `MapStyle` contract changes

The declarative renderer must bake textures, so it needs the PIXI `renderer`.
Components already own the `app` (hence the renderer), so this is threaded in:

- `createStarVisual`, `createBodyVisual`, `createSystemNodeVisual` context gains
  `renderer: Renderer` (the active app renderer). Existing call sites in the
  components pass `app.renderer`.
- **New** `createBackground(screen, renderer): Container | null` on `MapStyle`.
  Returns a screen-space background container (the parallax layers), or `null`
  for styles with no background treatment (tactical → `null`). The component adds
  it to `app.stage` **below** the viewport, rebuilds it on resize and
  style-change, and destroys it on teardown.

`createStageOverlay` (scanlines, above the viewport) is unchanged and remains the
"over" counterpart to the new "under" background.

### Background: parallax star field

- `createBackground` builds 2–3 `Sprite` layers from the baked nebula/starfield
  textures, ordered far → near, sized to cover the screen with margin for drift.
- The component wires the viewport's `moved` event to a handler that sets each
  layer's position to `-cameraCenter * parallaxFactor[layer]` (far layers have
  the smallest factor, so they move least). The handler is **registered on
  render and removed on destroy/style-switch** to avoid listener leaks (called
  out explicitly because this is the one piece that couples background to camera).
- Layers are screen-fixed otherwise and ignore pointer events
  (`eventMode = 'none'`, `interactiveChildren = false`), like the scanline
  overlay, so hit-testing is unaffected.

### Stars & bodies (still declarative shapes)

Extend the shape enums; do not replace existing variants.

- `StarShape` gains `'sphere'`: bright limb-darkened core (`buildSphere` with a
  near-centered light + bright color) plus a corona `buildStarGlow` sprite
  behind it, OBAFGKM-tinted via the existing spectral resolution.
- `BodyShape` gains `'sphere'`: `buildSphere` with an offset light → terminator.
  The per-`BodyType` `surface` treatment is chosen from a small map in the
  declarative renderer (gas-giant types → `'bands'`, rocky/moon → `'mottle'`,
  stations/comets → `'none'`), tinted by the existing body palette.
- `'disc' | 'ring' | 'gradient' | 'banded'` remain valid and unchanged, so
  `tactical` and imported styles are unaffected.

The component still owns `baseRadius` (from `getVisualRadius`), positioning,
scaling, event binding, and the hover/selection redraw loop. Visuals are returned
as `Container`s exactly as today; `hitArea` handling on interaction targets is
preserved (sprites are hit-testable, but the explicit `hitArea` set by the
components stays for consistency with the earlier stroke-only bugfix).

### Schema / validator / store

`StyleDefinition` gains optional fields (all optional → existing/imported files
still validate):

- `background?: { kind: 'parallax-starfield'; seed: number; density: number;
  nebulaColors: string[]; parallaxFactors: number[] }`.
- `star.shape` / `body.shape` accept the new `'sphere'` value.

Work to do:

- `types.ts` — add `BackgroundSpec`, extend `StarShape`/`BodyShape`, add
  `createBackground` to `MapStyle`, add `renderer` to the visual contexts.
- `validate.ts` — validate the optional `background` block (kind enum, finite
  numbers, hex color array, factor array) and accept `'sphere'`. Reject
  malformed input with the existing path-based error messages.
- `declarative.ts` — implement `'sphere'` rendering and `createBackground`;
  thread `renderer` through; map `BodyType → surface`.
- `builtins/realistic.ts` — opt into `star.shape: 'sphere'`, `body.shape:
  'sphere'`, and a `background` block with tuned nebula colors (warm Coriolis
  palette already in the file) and parallax factors.
- `builtins/tactical.ts` — unchanged.
- `stores/style.ts` — no behavioral change; built-ins still seed via
  `createDeclarativeStyle`.
- `components/StarMap.svelte` and `SolarSystemMap.svelte` — pass `app.renderer`
  into visual creation; build/attach/teardown the background container and its
  `moved` listener alongside the existing overlay lifecycle; preserve camera.

## Components / units (each independently testable)

| Unit | Does | Depends on |
| --- | --- | --- |
| `noise.ts` | Deterministic RNG / noise from a seed | nothing |
| `textures.ts` | Bake & cache glow/sphere/nebula/starfield textures | PIXI `renderer`, `noise` |
| `declarative.ts` (extended) | Map style def → runtime visuals incl. sphere + background | `textures`, `palette` |
| `validate.ts` (extended) | Accept/reject `background` + `'sphere'` | nothing |
| component glue | Pass renderer, mount/teardown background + parallax | PIXI app, viewport |

## Error handling

- `validate.ts` rejects malformed `background`/shape with a path-pointed message;
  invalid imports toast as today and are not registered.
- If texture baking ever fails (no renderer / context lost), `buildSphere`
  callers fall back to the existing flat `drawDisc` so a body is never invisible;
  `createBackground` returns `null` rather than throwing, so the map still renders
  on a plain background.
- The parallax `moved` listener is always removed on destroy/style-switch.

## Testing (TDD, Red → Green → Refactor)

**Unit (Vitest), written first:**

1. `noise` — same seed → identical sequence; different seeds differ; output in
   `[0,1)`.
2. `textures` — cache returns the same `Texture` instance for identical params
   and a new one for changed params; `clearTextureCache` resets it. Renderer is
   mocked; assert `generateTexture` is called with the expected derived params
   (e.g. light offset for `lightDir`, band/mottle for `surface`).
3. `validate` — accepts a def with a valid `background` and `'sphere'` shapes;
   rejects bad `kind`, non-finite numbers, non-hex nebula colors, wrong types;
   a def with **no** `background` still passes (back-compat).
4. `declarative` — `'sphere'` star/body produce a `Container` with a glow/sphere
   child; `createBackground` returns a container with the configured number of
   layers and `null` when no `background`; `BodyType → surface` mapping is
   correct.

**Component (Vitest + Testing Library, PIXI mocked):**

5. `StarMap` / `SolarSystemMap` pass `app.renderer` into `create*Visual`, mount
   the background below the viewport, register a `moved` listener, and **remove
   it on destroy**; switching style rebuilds the background.

**E2E (Playwright):**

6. Existing style-switch / persistence / import specs stay green (the optional
   schema additions must not break them).
7. A screenshot/attribute check that the realistic background is present (e.g. a
   background container/sprite exists) — pixel fidelity is eyeballed on a real
   build, consistent with the current approach.

Renderer-dependent pixel output is not asserted in unit tests (PIXI is mocked);
unit tests assert wiring and the pure math/caching.

## Verification

1. `pnpm nx test client` — unit/component green.
2. `pnpm nx run-many --targets=check` + `pnpm lint` — zero warnings.
3. `pnpm nx e2e web-e2e` — style specs pass.
4. Manual: serve the client, open a cluster, confirm the parallax star field
   drifts on pan, stars glow and are spectrally colored, planets read as lit
   spheres (bands on gas giants), and that switching to `tactical` and back works
   and tears the background down cleanly. Export `realistic`, re-import it, and
   confirm it still renders (shareable contract intact).

## Out of scope

- `tactical` changes; full procedural planet surfaces (continents/craters);
  twinkling/animated stars; bloom filter; any binary image assets; any
  Tauri/Rust changes; remote style sharing.
