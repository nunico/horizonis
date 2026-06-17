import { Container, Graphics, Sprite } from 'pixi.js';
import type { Renderer, TextStyleOptions } from 'pixi.js';
import { hexToNumber, resolveSpectralColor, resolveBodyColor } from './palette';
import { createScanlineOverlay } from './effects/scanlines';
import {
	buildStarGlow,
	buildSphere,
	buildNebulaLayer,
	buildStarfieldLayer
} from './procedural/textures';
import type { BodyType } from '$lib/types/stellar';
import type {
	StyleDefinition,
	MapStyle,
	MapColors,
	GlowSpec,
	StarShape,
	BodyShape,
	NodeShape,
	SurfaceTreatment,
	StarVisualContext,
	BodyVisualContext,
	SystemNodeVisualContext,
	LinkContext,
	OrbitContext,
	RegionContext,
	LabelKind,
	PointLike
} from './types';

/** Blend a color toward white by `t` (0..1) for cheap highlight cores. */
function lighten(color: number, t: number): number {
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;
	const mix = (c: number) => Math.round(c + (255 - c) * t);
	return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

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

/** When a renderer is unavailable, sphere degrades to the nearest vector look. */
function fallbackStarShape(shape: StarShape): StarShape {
	return shape === 'sphere' ? 'gradient' : shape;
}

function fallbackBodyShape(shape: BodyShape): BodyShape {
	return shape === 'sphere' ? 'disc' : shape;
}

/**
 * Stable small integer seed from an id string
 * (so mottling is deterministic).
 */
function hashId(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	}
	return h >>> 0;
}

/**
 * Draw a soft glow halo behind a shape: several concentric discs from the body
 * edge out to `radiusFactor`, faint at the rim and stronger toward the core,
 * approximating a radial bloom (a single flat disc reads as a hard grey ring).
 */
function addGlow(visual: Container, baseRadius: number, color: number, glow?: GlowSpec): void {
	if (!glow) return;
	const steps = 6;
	for (let i = 1; i <= steps; i++) {
		// i = 1 is the largest, faintest ring; i = steps hugs the body
		// and is brightest.
		const radius = baseRadius * (1 + (glow.radiusFactor - 1) * (1 - (i - 1) / steps));
		const halo = new Graphics();
		halo.circle(0, 0, radius).fill({
			color,
			alpha: glow.alpha * (i / steps) * 0.6
		});
		visual.addChild(halo);
	}
}

function drawDisc(visual: Container, radius: number, color: number): void {
	const g = new Graphics();
	g.circle(0, 0, radius).fill({ color });
	visual.addChild(g);
}

function drawRing(visual: Container, radius: number, color: number): void {
	const g = new Graphics();
	g.circle(0, 0, radius).stroke({
		width: Math.max(1, radius * 0.18),
		color
	});
	visual.addChild(g);
}

function drawGradient(visual: Container, radius: number, color: number): void {
	// Fake a radial gradient with a base disc plus a brighter inner highlight.
	const base = new Graphics();
	base.circle(0, 0, radius).fill({ color });
	visual.addChild(base);
	const core = new Graphics();
	core.circle(0, 0, radius * 0.55).fill({ color: lighten(color, 0.6), alpha: 0.9 });
	visual.addChild(core);
}

function drawBanded(visual: Container, radius: number, color: number): void {
	// Disc with a couple of darker horizontal bands (gas-giant look).
	drawDisc(visual, radius, color);
	const bands = new Graphics();
	const dark = lighten(color, -0); // keep hue; alpha provides contrast
	for (let i = -1; i <= 1; i++) {
		const y = (i * radius) / 2;
		bands.rect(-radius, y - radius * 0.12, radius * 2, radius * 0.24);
	}
	bands.fill({ color: dark, alpha: 0.25 });
	visual.addChild(bands);
}

function drawStarShape(visual: Container, shape: StarShape, radius: number, color: number): void {
	if (shape === 'ring') return drawRing(visual, radius, color);
	if (shape === 'gradient') return drawGradient(visual, radius, color);
	return drawDisc(visual, radius, color);
}

function drawBodyShape(visual: Container, shape: BodyShape, radius: number, color: number): void {
	if (shape === 'ring') return drawRing(visual, radius, color);
	if (shape === 'banded') return drawBanded(visual, radius, color);
	return drawDisc(visual, radius, color);
}

function drawNodeShape(visual: Container, shape: NodeShape, radius: number, color: number): void {
	if (shape === 'ring') return drawRing(visual, radius, color);
	return drawDisc(visual, radius, color);
}

function toColors(def: StyleDefinition): MapColors {
	const p = def.palette;
	return {
		accent: hexToNumber(p.accent),
		hover: hexToNumber(p.hover),
		linkIdle: hexToNumber(p.linkIdle),
		orbitHover: hexToNumber(p.orbitHover),
		region: hexToNumber(p.region),
		labelPrimary: hexToNumber(p.labelPrimary),
		labelSecondary: hexToNumber(p.labelSecondary),
		systemFill: hexToNumber(p.systemFill),
		background: hexToNumber(def.backgroundColor)
	};
}

/**
 * Turn a JSON {@link StyleDefinition} into the runtime {@link MapStyle} the map
 * components consume. This is the safe-sharing path: imported style files flow
 * through here, never through executable code.
 */
export function createDeclarativeStyle(def: StyleDefinition): MapStyle {
	const colors = toColors(def);

	return {
		meta: def.meta,
		colors,
		ui: def.ui,
		definition: def,

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

		createSystemNodeVisual({ baseRadius }: SystemNodeVisualContext): Container {
			const visual = new Container();
			addGlow(visual, baseRadius, colors.systemFill, def.systemNode.glow);
			drawNodeShape(visual, def.systemNode.shape, baseRadius, colors.systemFill);
			return visual;
		},

		stylePortal(graphics: Graphics, from: PointLike, to: PointLike, ctx: LinkContext): void {
			const color = ctx.highlighted ? colors.accent : colors.linkIdle;
			const alpha = ctx.hovered || ctx.highlighted ? 1 : def.stroke.portal.alpha;
			graphics
				.clear()
				.moveTo(from.x, from.y)
				.lineTo(to.x, to.y)
				.stroke({ width: def.stroke.portal.width * ctx.scale, color, alpha });
		},

		styleOrbit(graphics: Graphics, ctx: OrbitContext): void {
			const emphasized = ctx.selected || ctx.hovered;
			const color = ctx.selected
				? colors.accent
				: ctx.hovered
					? colors.orbitHover
					: colors.linkIdle;
			const alpha = emphasized ? 0.8 : def.stroke.orbit.alpha;
			const width = def.stroke.orbit.width * (emphasized ? 2 : 1) * ctx.scale;
			graphics.clear().circle(0, 0, ctx.radius).stroke({ width, color, alpha });
		},

		styleRegion(graphics: Graphics, ctx: RegionContext): void {
			const width = Math.max(0, ctx.outerRadius - ctx.innerRadius);
			graphics.clear().circle(0, 0, ctx.outerRadius).stroke({
				width,
				color: colors.region,
				alpha: def.stroke.region.alpha
			});
		},

		labelStyle(kind: LabelKind): Partial<TextStyleOptions> {
			const outline = def.label.outline;
			return {
				fontFamily: def.label.fontFamily,
				fontSize: def.label.fontSize,
				// PixiJS v8 accumulates letterSpacing per glyph when measuring text;
				// passing `undefined` yields a NaN width and an invisible (0-size)
				// label, so always resolve to a number.
				letterSpacing: def.label.letterSpacing ?? 0,
				fill: kind === 'body' ? colors.labelSecondary : colors.labelPrimary,
				stroke: outline
					? {
							color: hexToNumber(outline.color),
							width: outline.width,
							alpha: outline.alpha ?? 1,
							join: 'round'
						}
					: undefined
			};
		},

		createStageOverlay(screen): Container | null {
			const scanlines = def.effects?.scanlines;
			if (!scanlines) return null;
			return createScanlineOverlay(screen, scanlines, def.palette.labelPrimary);
		},

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
	};
}
