import type { StyleDefinition } from '../types';
import { OBAFGKM_HEX } from '../palette';

/**
 * Default look, modelled on the Coriolis "Third Horizon" maps: a warm
 * near-black star field with glowing amber system dots and gold portal lines in
 * the cluster, and spectrally-classified stars with strong coronal glow plus
 * shaded planets on faint orbit rings in the system view. Authored purely as
 * declarative data so users can export, fork, and extend it like any imported
 * style.
 */
export const realisticStyle: StyleDefinition = {
	meta: {
		id: 'realistic',
		name: 'Realistic Star Field',
		version: '1.1.0',
		author: 'Horizonis',
		description: 'Coriolis-style warm star field: glowing amber systems and spectral stars.'
	},
	backgroundColor: '#070503',
	palette: {
		// Gold selection / highlighted portals; muted gold-tan links at rest read
		// as amber portal lines in the cluster and faint orbit rings in-system.
		accent: '#ffc15e',
		hover: '#fff4d6',
		linkIdle: '#9a7b3f',
		orbitHover: '#e8c98a',
		region: '#7a5a2a',
		labelPrimary: '#f6e8cc',
		labelSecondary: '#c2a06a',
		systemFill: '#f4a63c',
		spectral: {
			O: OBAFGKM_HEX.O,
			B: OBAFGKM_HEX.B,
			A: OBAFGKM_HEX.A,
			F: OBAFGKM_HEX.F,
			G: OBAFGKM_HEX.G,
			K: OBAFGKM_HEX.K,
			M: OBAFGKM_HEX.M,
			default: '#ffb454'
		},
		body: {
			Planet: '#7c9fd6',
			Moon: '#b7a78f',
			SpaceStation: '#e0843c',
			DwarfPlanet: '#b08a6a',
			Comet: '#8fd4c8',
			default: '#c2a888'
		}
	},
	// Strong coronal glow on stars (Zalos/Zahedan in the reference).
	star: { shape: 'gradient', glow: { radiusFactor: 2.6, alpha: 0.3 } },
	// Small shaded spheres with a faint glow rather than banding every body.
	body: { shape: 'disc', glow: { radiusFactor: 1.5, alpha: 0.18 } },
	// Glowing amber cluster dots.
	systemNode: { shape: 'disc', glow: { radiusFactor: 2.4, alpha: 0.35 } },
	stroke: {
		orbit: { width: 1, alpha: 0.3 },
		portal: { width: 2, alpha: 0.55 },
		region: { width: 1, alpha: 0.18 }
	},
	label: { fontFamily: 'sans-serif', fontSize: 14 },
	// UI chrome keeps the neutral slate panels but shifts the accent (the `sky`
	// ramp: focus rings, active toggles, selection ticks) to amber/gold so it
	// reads as one piece with the warm Coriolis map.
	ui: {
		fontFamily: 'ui-sans-serif, system-ui, sans-serif',
		ramps: {
			sky: {
				'300': '#fcd34d',
				'400': '#fbbf24',
				'500': '#f59e0b',
				'600': '#d97706',
				'700': '#b45309',
				'800': '#92400e',
				'900': '#78350f'
			}
		}
	}
};
