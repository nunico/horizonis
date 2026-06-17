import { writable, derived } from 'svelte/store';
import { StyleRegistry } from '$lib/styles/registry';
import { createDeclarativeStyle } from '$lib/styles/declarative';
import { realisticStyle } from '$lib/styles/builtins/realistic';
import { tacticalStyle } from '$lib/styles/builtins/tactical';
import { validateStyleDefinition } from '$lib/styles/validate';
import {
	loadActiveStyleId,
	saveActiveStyleId,
	loadImportedStyles,
	saveImportedStyle
} from '$lib/styles/preferences';
import type { MapStyle } from '$lib/styles/types';

/** The style shown until the user picks another. */
export const DEFAULT_STYLE_ID = 'realistic';

/** Singleton registry of every available style (built-in + imported). */
export const registry = new StyleRegistry();

// Seed the built-ins. Both go through the declarative path — no special-casing —
// so they behave exactly like user-imported styles.
registry.register(createDeclarativeStyle(realisticStyle));
registry.register(createDeclarativeStyle(tacticalStyle));

// Re-hydrate any previously imported styles, skipping corrupt entries.
for (const def of loadImportedStyles()) {
	const result = validateStyleDefinition(def);
	if (result.ok) {
		registry.register(createDeclarativeStyle(result.value), { overwrite: true });
	}
}

/** Reactive list of available styles; updated when a style is imported. */
export const availableStyles = writable<MapStyle[]>(registry.list());

function initialStyleId(): string {
	const saved = loadActiveStyleId();
	return saved && registry.has(saved) ? saved : DEFAULT_STYLE_ID;
}

export const activeStyleId = writable<string>(initialStyleId());

/** The resolved active {@link MapStyle}, falling back to the default. */
export const activeStyle = derived(
	[activeStyleId, availableStyles],
	([$id]) => registry.get($id) ?? (registry.get(DEFAULT_STYLE_ID) as MapStyle)
);

/** Switch the active style (no-op for unknown ids) and persist the choice. */
export function setActiveStyle(id: string): void {
	if (!registry.has(id)) return;
	activeStyleId.set(id);
	saveActiveStyleId(id);
}

export type ImportResult = { ok: true; style: MapStyle } | { ok: false; error: string };

/**
 * Validate and register a style from imported JSON text. Re-import (same id)
 * overwrites the existing entry. Persists the definition for next session.
 */
export function importStyle(json: string): ImportResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return { ok: false, error: 'File is not valid JSON.' };
	}
	const result = validateStyleDefinition(parsed);
	if (!result.ok) return { ok: false, error: result.error };

	const style = createDeclarativeStyle(result.value);
	registry.register(style, { overwrite: true });
	saveImportedStyle(result.value);
	availableStyles.set(registry.list());
	return { ok: true, style };
}

/** Serialize a style's definition as pretty JSON, or null if not exportable. */
export function exportStyle(id: string): string | null {
	const def = registry.get(id)?.definition;
	return def ? JSON.stringify(def, null, 2) : null;
}
