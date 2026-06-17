import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal PIXI mock recording fill/stroke/primitive calls so we can assert the
// declarative renderer resolves the right colors and shapes.
vi.mock('pixi.js', () => {
	class Graphics {
		fills: Array<{ color?: number; alpha?: number }> = [];
		strokes: Array<{ width?: number; color?: number; alpha?: number }> = [];
		circles: Array<{ x: number; y: number; r: number }> = [];
		cleared = 0;
		lines: Array<{ x: number; y: number }> = [];
		circle(x: number, y: number, r: number) {
			this.circles.push({ x, y, r });
			return this;
		}
		rect() {
			return this;
		}
		fill(opts: { color?: number; alpha?: number }) {
			this.fills.push(opts);
			return this;
		}
		stroke(opts: { width?: number; color?: number; alpha?: number }) {
			this.strokes.push(opts);
			return this;
		}
		moveTo() {
			return this;
		}
		lineTo(x: number, y: number) {
			this.lines.push({ x, y });
			return this;
		}
		clear() {
			this.cleared++;
			return this;
		}
	}
	class Container {
		children: unknown[] = [];
		eventMode = 'auto';
		onRender: (() => void) | undefined;
		addChild(c: unknown) {
			this.children.push(c);
			return c;
		}
	}
	return { Graphics, Container };
});

import { createDeclarativeStyle } from './declarative';
import type { StyleDefinition } from './types';
import type { Star, OrbitalBody } from '$lib/types/stellar';

function def(overrides: Partial<StyleDefinition> = {}): StyleDefinition {
	return {
		meta: { id: 'd', name: 'D', version: '1.0.0' },
		backgroundColor: '#020617',
		palette: {
			accent: '#38bdf8',
			hover: '#ffffff',
			linkIdle: '#334155',
			orbitHover: '#f1f5f9',
			region: '#475569',
			labelPrimary: '#f1f5f9',
			labelSecondary: '#94a3b8',
			systemFill: '#38bdf8',
			spectral: {
				O: '#6b9fff',
				B: '#9fc8ff',
				A: '#e8e8e8',
				F: '#fff8d6',
				G: '#ffd966',
				K: '#ff9966',
				M: '#ff6644',
				default: '#222222'
			},
			body: {
				Planet: '#60a5fa',
				Moon: '#94a3b8',
				SpaceStation: '#ec4899',
				DwarfPlanet: '#a78bfa',
				Comet: '#2dd4bf',
				default: '#ffffff'
			}
		},
		star: { shape: 'disc' },
		body: { shape: 'disc' },
		systemNode: { shape: 'disc' },
		stroke: {
			orbit: { width: 1, alpha: 0.3 },
			portal: { width: 2, alpha: 0.6 },
			region: { width: 1, alpha: 0.2 }
		},
		label: { fontFamily: 'mono', fontSize: 12 },
		...overrides
	};
}

const star = (spectralClass: string): Star => ({
	Id: 's',
	Name: 'Star',
	SpectralClass: spectralClass,
	RadiusSol: 1,
	MassSol: 1,
	OrbitAu: 0,
	Satellites: [],
	OrbitalRegions: []
});

const planet: OrbitalBody = {
	Id: 'p',
	Name: 'Planet',
	BodyType: 'Planet',
	OrbitAu: 1,
	RadiusKm: 6000,
	MassEarth: 1,
	Satellites: [],
	Tags: []
};

describe('createDeclarativeStyle', () => {
	beforeEach(() => vi.clearAllMocks());

	it('exposes runtime color tokens as numbers from the palette', () => {
		const style = createDeclarativeStyle(def());
		expect(style.colors.accent).toBe(0x38bdf8);
		expect(style.colors.background).toBe(0x020617);
		expect(style.colors.labelPrimary).toBe(0xf1f5f9);
	});

	it('keeps the source definition for export', () => {
		const d = def();
		expect(createDeclarativeStyle(d).definition).toBe(d);
	});

	it('fills a star visual with its OBAFGKM spectral color', () => {
		const style = createDeclarativeStyle(def());
		const visual = style.createStarVisual({ star: star('K5V'), baseRadius: 10 }) as unknown as {
			children: Array<{ fills: Array<{ color?: number }> }>;
		};
		const colors = visual.children.flatMap((g) => g.fills.map((f) => f.color));
		expect(colors).toContain(0xff9966);
	});

	it('fills a body visual with its body-type color', () => {
		const style = createDeclarativeStyle(def());
		const visual = style.createBodyVisual({ body: planet, baseRadius: 6 }) as unknown as {
			children: Array<{ fills: Array<{ color?: number }> }>;
		};
		const colors = visual.children.flatMap((g) => g.fills.map((f) => f.color));
		expect(colors).toContain(0x60a5fa);
	});

	it('strokes a portal with the accent color when highlighted', () => {
		const style = createDeclarativeStyle(def());
		const g = new (class {
			strokes: Array<{ color?: number }> = [];
			clear() {
				return this;
			}
			moveTo() {
				return this;
			}
			lineTo() {
				return this;
			}
			stroke(o: { color?: number }) {
				this.strokes.push(o);
				return this;
			}
		})();
		style.stylePortal(
			g as never,
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ hovered: false, highlighted: true, scale: 1 }
		);
		expect(g.strokes.at(-1)?.color).toBe(0x38bdf8);
	});

	it('returns a scanline overlay only when the effect is configured', () => {
		const plain = createDeclarativeStyle(def());
		expect(plain.createStageOverlay({ width: 100, height: 100 })).toBeNull();

		const withEffect = createDeclarativeStyle(
			def({ effects: { scanlines: { intensity: 0.3, lineSpacing: 4 } } })
		);
		expect(withEffect.createStageOverlay({ width: 100, height: 100 })).not.toBeNull();
	});

	it('builds a label style from the definition typography and palette', () => {
		const style = createDeclarativeStyle(def());
		expect(style.labelStyle('star')).toMatchObject({
			fontFamily: 'mono',
			fontSize: 12,
			fill: 0xf1f5f9
		});
		expect(style.labelStyle('body').fill).toBe(0x94a3b8);
	});
});
