import type { Container, Graphics, Renderer, TextStyleOptions } from 'pixi.js';
import type { Star, OrbitalBody, SolarSystem, BodyType } from '$lib/types/stellar';

/**
 * The map-style system separates *appearance* from *layout/interaction*.
 *
 * - A {@link StyleDefinition} is pure, JSON-serializable data describing how a
 *   map should look. It is safe to export, edit, fork, and share — no code runs.
 * - A {@link MapStyle} is the runtime contract the map components consume. The
 *   built-in declarative renderer turns a {@link StyleDefinition} into a
 *   {@link MapStyle}; advanced users may register a hand-written `MapStyle`
 *   directly (the code escape-hatch).
 *
 * Components own positions, scaling (`auToPixels`/`getVisualRadius`), camera and
 * the hover/selection redraw loop. Styles only decide colors, shapes, label
 * typography and screen-space effects.
 */

/** The seven Morgan–Keenan spectral classes, hot → cool. */
export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export const SPECTRAL_CLASSES: readonly SpectralClass[] = [
	'O',
	'B',
	'A',
	'F',
	'G',
	'K',
	'M'
] as const;

/** Color per spectral class plus a fallback for unknown classifications. */
export type SpectralPalette = Record<SpectralClass, string> & { default: string };

/** Color per orbital-body type plus a fallback for unknown types. */
export type BodyPalette = Record<BodyType, string> & { default: string };

export interface StylePalette {
	/** Selection highlight + emphasized links. */
	accent: string;
	/** Hover outline. */
	hover: string;
	/** Portals / orbits at rest. */
	linkIdle: string;
	/** Orbit stroke while hovered. */
	orbitHover: string;
	/** Orbital-region band stroke. */
	region: string;
	labelPrimary: string;
	labelSecondary: string;
	/** Cluster-view system node fill. */
	systemFill: string;
	spectral: SpectralPalette;
	body: BodyPalette;
}

export type StarShape = 'disc' | 'ring' | 'gradient' | 'sphere';
export type BodyShape = 'disc' | 'ring' | 'banded' | 'sphere';
export type NodeShape = 'disc' | 'ring';

/** Per-body-type surface treatment for the procedural `'sphere'` shape. */
export type SurfaceTreatment = 'none' | 'bands' | 'mottle';

export interface GlowSpec {
	/** Outer glow radius as a multiple of the body's base radius. */
	radiusFactor: number;
	alpha: number;
}

export interface StrokeSpec {
	width: number;
	alpha: number;
}

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

/**
 * Crisp text outline so labels stay legible over bright glows and busy
 * backgrounds. Maps to a PixiJS text stroke drawn around each glyph.
 */
export interface LabelOutlineSpec {
	color: string;
	width: number;
	alpha?: number;
}

export interface LabelSpec {
	fontFamily: string;
	fontSize: number;
	letterSpacing?: number;
	/** Optional contrast outline so labels survive bright/cluttered styles. */
	outline?: LabelOutlineSpec;
}

export interface ScanlinesSpec {
	/** 0..1 darkness of the scan lines. */
	intensity: number;
	/** Distance between lines in screen pixels. */
	lineSpacing: number;
	/** 0..1 subtle brightness flicker over time; 0 disables animation. */
	flicker?: number;
}

export interface BloomSpec {
	/** 0..1 strength of the additive bloom applied to bright shapes. */
	strength: number;
}

export interface EffectsSpec {
	scanlines?: ScanlinesSpec;
	bloom?: BloomSpec;
}

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

/** Tailwind ramp shades the UI chrome draws from. */
export type RampShade =
	| '50'
	| '100'
	| '200'
	| '300'
	| '400'
	| '500'
	| '600'
	| '700'
	| '800'
	| '900'
	| '950';

export const RAMP_SHADES: readonly RampShade[] = [
	'50',
	'100',
	'200',
	'300',
	'400',
	'500',
	'600',
	'700',
	'800',
	'900',
	'950'
] as const;

/** Per-shade hex overrides for a Tailwind color ramp (any subset of shades). */
export type RampOverride = Partial<Record<RampShade, string>>;

/**
 * Optional theming of the HTML/CSS chrome (navbar, panels, dialogs, toasts).
 * The app's Tailwind `slate`/`sky` palettes are backed by CSS variables; a
 * style overrides those ramps to re-skin the whole UI without per-component
 * edits. Omitted ramps fall back to the default (realistic) values in app.css.
 */
export interface UiThemeSpec {
	/** CSS font-family applied to the document body. */
	fontFamily: string;
	ramps?: {
		slate?: RampOverride;
		sky?: RampOverride;
	};
}

export interface StyleMeta {
	id: string;
	name: string;
	version: string;
	author?: string;
	description?: string;
}

/**
 * The shareable, JSON-serializable description of a map style. All colors are
 * `#RRGGBB` hex strings so the file is human-readable and editable.
 */
export interface StyleDefinition {
	meta: StyleMeta;
	backgroundColor: string;
	palette: StylePalette;
	star: { shape: StarShape; glow?: GlowSpec };
	body: { shape: BodyShape; glow?: GlowSpec };
	systemNode: { shape: NodeShape; glow?: GlowSpec };
	stroke: { orbit: StrokeSpec; portal: StrokeSpec; region: StrokeSpec };
	/** How orbital regions (asteroid belts) render. Absent ⇒ `'band'`. */
	regionStyle?: RegionStyleSpec;
	label: LabelSpec;
	effects?: EffectsSpec;
	/** Optional theming of the surrounding HTML/CSS UI chrome. */
	ui?: UiThemeSpec;
	/** Optional procedural background (parallax star field). */
	background?: BackgroundSpec;
}

/** Runtime color tokens (PixiJS 0xRRGGBB numbers) read by overlay code. */
export interface MapColors {
	accent: number;
	hover: number;
	linkIdle: number;
	orbitHover: number;
	region: number;
	labelPrimary: number;
	labelSecondary: number;
	systemFill: number;
	background: number;
}

export interface StarVisualContext {
	star: Star;
	/** Size budget computed by the component from `getVisualRadius`. */
	baseRadius: number;
	/** Active PIXI renderer, used to bake procedural textures. Optional so
	 * styles that draw only vector primitives (and unit tests) work without it. */
	renderer?: Renderer;
}

export interface BodyVisualContext {
	body: OrbitalBody;
	baseRadius: number;
	/** Active PIXI renderer, used to bake procedural textures. Optional so
	 * styles that draw only vector primitives (and unit tests) work without it. */
	renderer?: Renderer;
}

export interface SystemNodeVisualContext {
	system: SolarSystem;
	baseRadius: number;
	/** Active PIXI renderer, used to bake procedural textures. Optional so
	 * styles that draw only vector primitives (and unit tests) work without it. */
	renderer?: Renderer;
}

export interface LinkContext {
	/** Pointer is over this link. */
	hovered: boolean;
	/** Link connects to the active selection and should be emphasized. */
	highlighted: boolean;
	/** Stroke length in world units, for width compensation by the caller. */
	scale: number;
}

export interface OrbitContext {
	hovered: boolean;
	/** Orbit belongs to the currently selected entity. */
	selected: boolean;
	scale: number;
	radius: number;
}

export interface RegionContext {
	innerRadius: number;
	outerRadius: number;
}

export type LabelKind = 'system' | 'star' | 'body';

/**
 * The runtime contract every style satisfies. Both the declarative renderer and
 * any hand-written escape-hatch style produce one of these.
 */
export interface MapStyle {
	meta: StyleMeta;
	colors: MapColors;
	createStarVisual(ctx: StarVisualContext): Container;
	createBodyVisual(ctx: BodyVisualContext): Container;
	createSystemNodeVisual(ctx: SystemNodeVisualContext): Container;
	stylePortal(graphics: Graphics, from: PointLike, to: PointLike, ctx: LinkContext): void;
	styleOrbit(graphics: Graphics, ctx: OrbitContext): void;
	styleRegion(graphics: Graphics, ctx: RegionContext): void;
	labelStyle(kind: LabelKind): Partial<TextStyleOptions>;
	/**
	 * Build a screen-space overlay (e.g. CRT scanlines) sized to the canvas, or
	 * null when the style has no overlay. The caller adds it above the viewport
	 * and rebuilds it on resize/style change. Implemented as scene-graph nodes
	 * (not GL filters) so it behaves identically on WebGL and WebGPU.
	 */
	createStageOverlay(screen: { width: number; height: number }): Container | null;
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
	/** Optional theming of the surrounding HTML/CSS chrome. */
	ui?: UiThemeSpec;
	/** The definition this style was built from, for export. Absent for code styles. */
	definition?: StyleDefinition;
}

export interface PointLike {
	x: number;
	y: number;
}
