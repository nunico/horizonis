import { writable } from 'svelte/store';
import type { StarCluster } from '$lib/types/stellar';
import { saveCluster } from '$lib/stores/clusterData';

/** Max number of cluster snapshots kept for undo. */
export const MAX_HISTORY = 20;

const undoStack: StarCluster[] = [];

/** True when there is at least one snapshot to undo. */
export const canUndo = writable(false);

/**
 * Record the cluster state *before* a destructive/positional change so it can
 * be restored later. Snapshots are deep-cloned to decouple from live mutation.
 */
export function recordSnapshot(snapshot: StarCluster): void {
	undoStack.push(structuredClone(snapshot));
	if (undoStack.length > MAX_HISTORY) undoStack.shift();
	canUndo.set(true);
}

/**
 * Restore the most recent snapshot, persisting it as the current cluster.
 * @returns true if a snapshot was restored, false if there was nothing to undo.
 */
export async function undo(): Promise<boolean> {
	const previous = undoStack.pop();
	canUndo.set(undoStack.length > 0);
	if (!previous) return false;
	await saveCluster(previous);
	return true;
}

/** Drop all recorded snapshots. */
export function clearHistory(): void {
	undoStack.length = 0;
	canUndo.set(false);
}
