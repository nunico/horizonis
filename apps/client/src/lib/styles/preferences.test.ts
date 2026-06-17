import { describe, it, expect, beforeEach } from 'vitest';
import {
	loadActiveStyleId,
	saveActiveStyleId,
	loadImportedStyles,
	saveImportedStyle
} from './preferences';
import type { StyleDefinition } from './types';

function sampleDefinition(id: string): StyleDefinition {
	return {
		meta: { id, name: id, version: '1.0.0' },
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
		star: { shape: 'gradient' },
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

describe('active style id persistence', () => {
	beforeEach(() => localStorage.clear());

	it('returns null when no style id is stored', () => {
		expect(loadActiveStyleId()).toBeNull();
	});

	it('round-trips a saved style id', () => {
		saveActiveStyleId('tactical');
		expect(loadActiveStyleId()).toBe('tactical');
	});
});

describe('imported style persistence', () => {
	beforeEach(() => localStorage.clear());

	it('returns an empty array when nothing is stored', () => {
		expect(loadImportedStyles()).toEqual([]);
	});

	it('appends and round-trips imported definitions', () => {
		const a = sampleDefinition('aurora');
		saveImportedStyle(a);
		expect(loadImportedStyles()).toEqual([a]);
	});

	it('replaces an existing imported style with the same id', () => {
		saveImportedStyle(sampleDefinition('aurora'));
		const updated = sampleDefinition('aurora');
		updated.meta.name = 'Aurora v2';
		saveImportedStyle(updated);
		const stored = loadImportedStyles();
		expect(stored).toHaveLength(1);
		expect(stored[0].meta.name).toBe('Aurora v2');
	});

	it('ignores corrupted stored JSON and returns an empty array', () => {
		localStorage.setItem('horizonis_styles', '{not json');
		expect(loadImportedStyles()).toEqual([]);
	});
});
