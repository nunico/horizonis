/**
 * Whether E2E debug hooks (viewport handles, readiness flags) should be exposed
 * on `window`. True in dev, or when the build/runtime signals an E2E run.
 *
 * `import.meta.env.PUBLIC_E2E` is only inlined when the env var is present at
 * build time, so we also honor the runtime `window.PUBLIC_E2E` flag set by the
 * Playwright init script and `navigator.webdriver`.
 */
export function isE2EDebugEnabled(): boolean {
	if (typeof window === 'undefined') return false;
	const win = window as Window & { PUBLIC_E2E?: string | boolean };
	return Boolean(
		import.meta.env.DEV ||
		import.meta.env.PUBLIC_E2E === '1' ||
		win.PUBLIC_E2E === '1' ||
		win.PUBLIC_E2E === true ||
		win.navigator.webdriver
	);
}
