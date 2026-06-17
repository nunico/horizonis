/** @type {import('tailwindcss').Config} */

// Back the slate/sky ramps with CSS variables so the active map style can
// re-skin the entire UI chrome. Defaults (the realistic look) live in app.css.
const ramp = (name) =>
	Object.fromEntries(
		['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((shade) => [
			shade,
			`rgb(var(--${name}-${shade}) / <alpha-value>)`
		])
	);

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				slate: ramp('slate'),
				sky: ramp('sky')
			},
			fontFamily: {
				sans: 'var(--hz-font)'
			}
		}
	},
	plugins: []
};
