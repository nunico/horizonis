import { hexToRgbString } from './palette';
import { RAMP_SHADES } from './types';
import type { UiThemeSpec } from './types';

/**
 * Maps a {@link UiThemeSpec} to the CSS custom properties that re-skin the HTML
 * chrome. The app's Tailwind `slate`/`sky` palettes are defined as
 * `rgb(var(--slate-N) / <alpha-value>)` (defaults in app.css), so overriding
 * these variables re-themes every component that uses those classes.
 */

const RAMP_NAMES = ['slate', 'sky'] as const;

/** Every variable this module may set — used to fully reset before applying. */
export const MANAGED_UI_VARS: string[] = [
	'--hz-font',
	...RAMP_NAMES.flatMap((ramp) => RAMP_SHADES.map((shade) => `--${ramp}-${shade}`))
];

/** Build the CSS variables to apply for a style's UI theme (empty if none). */
export function buildUiCssVars(spec: UiThemeSpec | undefined): Record<string, string> {
	if (!spec) return {};
	const vars: Record<string, string> = { '--hz-font': spec.fontFamily };

	for (const ramp of RAMP_NAMES) {
		const overrides = spec.ramps?.[ramp];
		if (!overrides) continue;
		for (const shade of RAMP_SHADES) {
			const hex = overrides[shade];
			if (hex) vars[`--${ramp}-${shade}`] = hexToRgbString(hex);
		}
	}

	return vars;
}

/**
 * Apply a style's UI theme to the document root: clears any previously managed
 * variables (so switching back to a style without overrides restores app.css
 * defaults), then sets the new ones.
 */
export function applyUiTheme(spec: UiThemeSpec | undefined): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const vars = buildUiCssVars(spec);

	for (const name of MANAGED_UI_VARS) {
		if (name in vars) {
			root.style.setProperty(name, vars[name]);
		} else {
			root.style.removeProperty(name);
		}
	}
}
