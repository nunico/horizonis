import { describe, it, expect } from 'vitest';
import { validateStyleDefinition } from './validate';
import type { StyleDefinition } from './types';

function makeValid(): StyleDefinition {
	return {
		meta: { id: 'sample', name: 'Sample', version: '1.0.0' },
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
				default: '#38bdf8'
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
		star: { shape: 'gradient', glow: { radiusFactor: 2, alpha: 0.4 } },
		body: { shape: 'disc' },
		systemNode: { shape: 'disc' },
		stroke: {
			orbit: { width: 1, alpha: 0.3 },
			portal: { width: 2, alpha: 0.6 },
			region: { width: 1, alpha: 0.2 }
		},
		label: { fontFamily: 'sans-serif', fontSize: 14 }
	};
}

describe('validateStyleDefinition', () => {
	it('accepts a well-formed definition', () => {
		const result = validateStyleDefinition(makeValid());
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.meta.id).toBe('sample');
		}
	});

	it('accepts a definition carrying an optional effects block', () => {
		const def = makeValid();
		def.effects = { scanlines: { intensity: 0.3, lineSpacing: 3, flicker: 0.05 } };
		expect(validateStyleDefinition(def).ok).toBe(true);
	});

	it('rejects non-object input', () => {
		expect(validateStyleDefinition(null).ok).toBe(false);
		expect(validateStyleDefinition('nope').ok).toBe(false);
		expect(validateStyleDefinition(42).ok).toBe(false);
	});

	it('rejects a definition missing required meta fields', () => {
		const def = makeValid() as unknown as Record<string, unknown>;
		delete (def.meta as Record<string, unknown>).id;
		const result = validateStyleDefinition(def);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/meta\.id/);
	});

	it('rejects a malformed background color', () => {
		const def = makeValid();
		def.backgroundColor = 'rebeccapurple';
		expect(validateStyleDefinition(def).ok).toBe(false);
	});

	it('rejects a spectral palette missing an OBAFGKM class', () => {
		const def = makeValid() as unknown as Record<string, unknown>;
		const palette = (def.palette as Record<string, unknown>).spectral as Record<string, unknown>;
		delete palette.K;
		expect(validateStyleDefinition(def).ok).toBe(false);
	});

	it('rejects an unknown shape value', () => {
		const def = makeValid();
		(def.star as unknown as Record<string, unknown>).shape = 'triangle';
		expect(validateStyleDefinition(def).ok).toBe(false);
	});

	it('rejects a non-numeric stroke width', () => {
		const def = makeValid();
		(def.stroke.orbit as unknown as Record<string, unknown>).width = 'thick';
		expect(validateStyleDefinition(def).ok).toBe(false);
	});
});
