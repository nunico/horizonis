import type { StyleDefinition } from '../types';

/**
 * Retro-futuristic CRT tactical map: a near-black field with a single light-mint
 * foreground, simple high-contrast ring/dot/line primitives, and screen-space
 * scanlines. Two colors only — every spectral class and body type resolves to
 * the same mint tone, so the look stays flat and tactical. Authored as plain
 * declarative data, fully user-editable.
 */
const MINT = '#a7f3d0';
const MINT_DIM = '#5eead4';

export const tacticalStyle: StyleDefinition = {
	meta: {
		id: 'tactical',
		name: 'Tactical CRT',
		version: '1.0.0',
		author: 'Horizonis',
		description: 'Two-color mint-on-black tactical display with scanlines.'
	},
	backgroundColor: '#05140f',
	palette: {
		accent: '#ffffff',
		hover: '#ffffff',
		linkIdle: MINT_DIM,
		orbitHover: MINT,
		region: MINT_DIM,
		labelPrimary: MINT,
		labelSecondary: MINT_DIM,
		systemFill: MINT,
		spectral: {
			O: MINT,
			B: MINT,
			A: MINT,
			F: MINT,
			G: MINT,
			K: MINT,
			M: MINT,
			default: MINT
		},
		body: {
			Planet: MINT,
			Moon: MINT,
			SpaceStation: MINT,
			DwarfPlanet: MINT,
			Comet: MINT,
			default: MINT
		}
	},
	star: { shape: 'ring' },
	body: { shape: 'disc' },
	systemNode: { shape: 'ring' },
	stroke: {
		orbit: { width: 1, alpha: 0.6 },
		portal: { width: 1.5, alpha: 0.8 },
		region: { width: 1, alpha: 0.3 }
	},
	label: { fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 },
	effects: { scanlines: { intensity: 0.18, lineSpacing: 3, flicker: 0.04 } }
};
