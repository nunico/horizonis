import type { StyleDefinition } from '../types';
import { OBAFGKM_HEX } from '../palette';

/**
 * Default look: a realistic dark star field. Authored purely as declarative
 * data (no privileged code path) so users can export, fork, and extend it like
 * any imported style. Stars get a glowing gradient core colored by OBAFGKM
 * class; gas-giant-scale planets read as banded discs.
 */
export const realisticStyle: StyleDefinition = {
	meta: {
		id: 'realistic',
		name: 'Realistic Star Field',
		version: '1.0.0',
		author: 'Horizonis',
		description: 'Dark space with glowing, spectrally-classified stars and shaded planets.'
	},
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
			O: OBAFGKM_HEX.O,
			B: OBAFGKM_HEX.B,
			A: OBAFGKM_HEX.A,
			F: OBAFGKM_HEX.F,
			G: OBAFGKM_HEX.G,
			K: OBAFGKM_HEX.K,
			M: OBAFGKM_HEX.M,
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
	star: { shape: 'gradient', glow: { radiusFactor: 2.1, alpha: 0.22 } },
	body: { shape: 'banded', glow: { radiusFactor: 1.4, alpha: 0.12 } },
	systemNode: { shape: 'disc' },
	stroke: {
		orbit: { width: 1, alpha: 0.35 },
		portal: { width: 2, alpha: 0.5 },
		region: { width: 1, alpha: 0.2 }
	},
	label: { fontFamily: 'sans-serif', fontSize: 14 }
};
