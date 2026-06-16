import type { ViewMode } from '$lib/stores/appState';

/**
 * Inputs needed to decide what a global keypress should do. Kept as a plain
 * value object so the resolver is pure and unit-testable in isolation.
 */
export interface ShortcutContext {
	key: string;
	/** Focus is in an <input>/<textarea> — typing keys must be ignored. */
	inEditable: boolean;
	helpOpen: boolean;
	searchResultsOpen: boolean;
	hasSelection: boolean;
	viewMode: ViewMode;
}

export type ShortcutAction =
	| 'toggle-help'
	| 'close-help'
	| 'focus-search'
	| 'close-search'
	| 'clear-selection'
	| 'back-to-cluster'
	| 'none';

/**
 * Single source of truth for global keyboard shortcuts.
 *
 * Precedence for Escape dismisses the topmost layer first
 * (help → search dropdown → selection) and works even while typing.
 * Typing keys (`?`, `/`, Backspace) are suppressed inside editable fields.
 */
export function resolveShortcut(ctx: ShortcutContext): ShortcutAction {
	if (ctx.key === 'Escape') {
		if (ctx.helpOpen) return 'close-help';
		if (ctx.searchResultsOpen) return 'close-search';
		if (ctx.hasSelection) return 'clear-selection';
		return 'none';
	}

	if (ctx.inEditable) return 'none';

	if (ctx.key === '?') return 'toggle-help';
	if (ctx.key === '/') return 'focus-search';
	if (ctx.key === 'Backspace' && ctx.viewMode === 'system') return 'back-to-cluster';

	return 'none';
}
