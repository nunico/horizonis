import { writable } from 'svelte/store';

/** Whether the keyboard-shortcuts help overlay is visible. */
export const helpOpen = writable(false);

/** Whether the navigation search dropdown is currently open. */
export const searchResultsOpen = writable(false);

/**
 * Monotonic counter bumped whenever something requests focus on the search
 * input (e.g. the "/" shortcut). Navigation watches this and focuses its input.
 */
export const searchFocusSignal = writable(0);

/** Ask the navigation bar to focus its search input. */
export function requestSearchFocus(): void {
	searchFocusSignal.update((n) => n + 1);
}
