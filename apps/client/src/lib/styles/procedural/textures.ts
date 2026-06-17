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
		`sphere:${p.color}:${p.radius}:${p.surface}:${p.lightAngle.toFixed(4)}:${p.seed}`,
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
				// Outermost disc is the dark limb; inner discs brighten toward the
				// lit core (negative shade darkens the night side, positive lightens).
				const color = i === 0 ? limb : shade(p.color, (t - 0.5) * 0.6);
				const g = new Graphics();
				g.circle(cx, cy, rad).fill({ color, alpha: 1 });
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
	return memo(`nebula:${p.size}:${p.seed}:${p.colors.join(',')}:${p.blobCount}`, () => {
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
	});
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
