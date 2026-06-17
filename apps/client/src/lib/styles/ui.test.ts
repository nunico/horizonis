import { describe, it, expect } from 'vitest';
import { buildUiCssVars, MANAGED_UI_VARS } from './ui';
import type { UiThemeSpec } from './types';

describe('buildUiCssVars', () => {
	it('returns an empty map when no spec is given', () => {
		expect(buildUiCssVars(undefined)).toEqual({});
	});

	it('sets the font-family variable from the spec', () => {
		const spec: UiThemeSpec = { fontFamily: 'ui-monospace, monospace' };
		expect(buildUiCssVars(spec)['--hz-font']).toBe('ui-monospace, monospace');
	});

	it('converts ramp hex overrides into space-separated RGB triplets', () => {
		const spec: UiThemeSpec = {
			fontFamily: 'monospace',
			ramps: { slate: { '900': '#05140f' }, sky: { '500': '#34d399' } }
		};
		const vars = buildUiCssVars(spec);
		expect(vars['--slate-900']).toBe('5 20 15');
		expect(vars['--sky-500']).toBe('52 211 153');
	});

	it('only emits variables for shades the spec overrides', () => {
		const spec: UiThemeSpec = { fontFamily: 'monospace', ramps: { slate: { '800': '#0a2f22' } } };
		const vars = buildUiCssVars(spec);
		expect(vars['--slate-800']).toBeDefined();
		expect(vars['--slate-700']).toBeUndefined();
	});

	it('every variable it can emit is declared as managed for clean resets', () => {
		const spec: UiThemeSpec = {
			fontFamily: 'monospace',
			ramps: { slate: { '950': '#020a07' }, sky: { '600': '#10b981' } }
		};
		for (const key of Object.keys(buildUiCssVars(spec))) {
			expect(MANAGED_UI_VARS).toContain(key);
		}
	});
});
