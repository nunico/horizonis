import { describe, it, expect, beforeEach } from 'vitest';
import { StyleRegistry } from './registry';
import type { MapStyle } from './types';

function fakeStyle(id: string, name = id): MapStyle {
	return {
		meta: { id, name, version: '1.0.0' },
		colors: {
			accent: 0,
			hover: 0,
			linkIdle: 0,
			orbitHover: 0,
			region: 0,
			labelPrimary: 0,
			labelSecondary: 0,
			systemFill: 0,
			background: 0
		},
		createStarVisual: () => ({}) as never,
		createBodyVisual: () => ({}) as never,
		createSystemNodeVisual: () => ({}) as never,
		stylePortal: () => {},
		styleOrbit: () => {},
		styleRegion: () => {},
		labelStyle: () => ({}),
		createStageOverlay: () => null
	};
}

describe('StyleRegistry', () => {
	let registry: StyleRegistry;

	beforeEach(() => {
		registry = new StyleRegistry();
	});

	it('registers and retrieves a style by id', () => {
		const style = fakeStyle('realistic');
		registry.register(style);
		expect(registry.get('realistic')).toBe(style);
	});

	it('lists registered styles in insertion order', () => {
		registry.register(fakeStyle('realistic'));
		registry.register(fakeStyle('tactical'));
		expect(registry.list().map((s) => s.meta.id)).toEqual(['realistic', 'tactical']);
	});

	it('returns undefined for an unknown id', () => {
		expect(registry.get('nope')).toBeUndefined();
	});

	it('reports whether an id is registered', () => {
		registry.register(fakeStyle('realistic'));
		expect(registry.has('realistic')).toBe(true);
		expect(registry.has('tactical')).toBe(false);
	});

	it('rejects registering a duplicate id', () => {
		registry.register(fakeStyle('realistic'));
		expect(() => registry.register(fakeStyle('realistic'))).toThrow(/already registered/);
	});

	it('replaces an existing style when explicitly overwriting (re-import)', () => {
		registry.register(fakeStyle('realistic', 'Old'));
		const updated = fakeStyle('realistic', 'New');
		registry.register(updated, { overwrite: true });
		expect(registry.get('realistic')).toBe(updated);
		expect(registry.list()).toHaveLength(1);
	});
});
