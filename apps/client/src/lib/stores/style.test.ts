import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// declarative.ts imports pixi.js at module load; a tiny mock is enough since no
// drawing happens during these store-level tests.
vi.mock('pixi.js', () => ({
	Container: class {
		addChild() {}
	},
	Graphics: class {
		circle() {
			return this;
		}
		rect() {
			return this;
		}
		fill() {
			return this;
		}
		stroke() {
			return this;
		}
	}
}));

import {
	registry,
	activeStyleId,
	activeStyle,
	availableStyles,
	setActiveStyle,
	importStyle,
	exportStyle,
	DEFAULT_STYLE_ID
} from './style';

beforeEach(() => {
	localStorage.clear();
	setActiveStyle(DEFAULT_STYLE_ID);
});

describe('style store', () => {
	it('seeds the two built-in styles', () => {
		const ids = registry.list().map((s) => s.meta.id);
		expect(ids).toContain('realistic');
		expect(ids).toContain('tactical');
	});

	it('defaults the active style to realistic', () => {
		expect(get(activeStyleId)).toBe('realistic');
		expect(get(activeStyle).meta.id).toBe('realistic');
	});

	it('switches and persists the active style', () => {
		setActiveStyle('tactical');
		expect(get(activeStyle).meta.id).toBe('tactical');
		expect(localStorage.getItem('horizonis_style_id')).toBe('tactical');
	});

	it('ignores a request to activate an unknown style', () => {
		setActiveStyle('does-not-exist');
		expect(get(activeStyleId)).toBe('realistic');
	});

	it('rejects importing non-JSON text', () => {
		const result = importStyle('not json at all');
		expect(result.ok).toBe(false);
	});

	it('rejects importing a structurally invalid style', () => {
		const result = importStyle(JSON.stringify({ meta: { id: 'x' } }));
		expect(result.ok).toBe(false);
	});

	it('registers a valid imported style and exposes it as available', () => {
		const def = exportStyle('realistic');
		expect(def).not.toBeNull();
		const forked = JSON.parse(def as string);
		forked.meta.id = 'forked';
		forked.meta.name = 'Forked';

		const result = importStyle(JSON.stringify(forked));
		expect(result.ok).toBe(true);
		expect(get(availableStyles).map((s) => s.meta.id)).toContain('forked');
		expect(registry.has('forked')).toBe(true);
	});

	it('exports a built-in definition as pretty JSON round-trippable to itself', () => {
		const json = exportStyle('tactical');
		expect(json).not.toBeNull();
		expect(JSON.parse(json as string).meta.id).toBe('tactical');
	});

	it('returns null when exporting an unknown style', () => {
		expect(exportStyle('nope')).toBeNull();
	});
});
