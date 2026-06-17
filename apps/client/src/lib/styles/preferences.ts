import type { StyleDefinition } from './types';

/**
 * Lightweight UI preference persistence for map styles. Uses `localStorage`,
 * which works in both the browser and the Tauri webview, so no Rust commands are
 * needed. Intentionally separate from the cluster `StorageProvider`, which is
 * dedicated to cluster data + WASM/Tauri.
 */

const ACTIVE_KEY = 'horizonis_style_id';
const IMPORTED_KEY = 'horizonis_styles';

function hasStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export function loadActiveStyleId(): string | null {
	if (!hasStorage()) return null;
	return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveStyleId(id: string): void {
	if (!hasStorage()) return;
	localStorage.setItem(ACTIVE_KEY, id);
}

export function loadImportedStyles(): StyleDefinition[] {
	if (!hasStorage()) return [];
	const raw = localStorage.getItem(IMPORTED_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as StyleDefinition[]) : [];
	} catch {
		return [];
	}
}

/** Append or replace (by id) an imported style definition. */
export function saveImportedStyle(definition: StyleDefinition): void {
	if (!hasStorage()) return;
	const existing = loadImportedStyles().filter((d) => d.meta.id !== definition.meta.id);
	existing.push(definition);
	localStorage.setItem(IMPORTED_KEY, JSON.stringify(existing));
}
