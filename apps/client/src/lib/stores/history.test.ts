import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { canUndo, recordSnapshot, undo, clearHistory, MAX_HISTORY } from './history';
import { cluster, _resetStorage } from './clusterData';
import type { StarCluster } from '$lib/types/stellar';

function makeCluster(name: string): StarCluster {
	return { Name: name, Systems: [] };
}

describe('history store', () => {
	beforeEach(() => {
		clearHistory();
		cluster.set(null);
		_resetStorage();
		localStorage.clear();
		// @ts-expect-error - ensure browser storage path
		delete window.__TAURI_INTERNALS__;
		vi.clearAllMocks();
	});

	it('marks canUndo true after recording a snapshot', () => {
		expect(get(canUndo)).toBe(false);
		recordSnapshot(makeCluster('A'));
		expect(get(canUndo)).toBe(true);
	});

	it('restores the most recent snapshot on undo and updates the cluster', async () => {
		recordSnapshot(makeCluster('Original'));

		const restored = await undo();

		expect(restored).toBe(true);
		expect(get(cluster)?.Name).toBe('Original');
		expect(get(canUndo)).toBe(false);
	});

	it('does not mutate a recorded snapshot when the source object changes later', async () => {
		const live = makeCluster('Snapshot');
		recordSnapshot(live);
		live.Name = 'Mutated';

		await undo();

		expect(get(cluster)?.Name).toBe('Snapshot');
	});

	it('returns false when there is nothing to undo', async () => {
		expect(await undo()).toBe(false);
	});

	it('keeps canUndo true while snapshots remain (LIFO order)', async () => {
		recordSnapshot(makeCluster('first'));
		recordSnapshot(makeCluster('second'));

		expect(await undo()).toBe(true);
		expect(get(cluster)?.Name).toBe('second');
		expect(get(canUndo)).toBe(true);

		expect(await undo()).toBe(true);
		expect(get(cluster)?.Name).toBe('first');
		expect(get(canUndo)).toBe(false);
	});

	it('caps the stack at MAX_HISTORY snapshots', async () => {
		for (let i = 0; i < MAX_HISTORY + 5; i++) {
			recordSnapshot(makeCluster(`snap-${i}`));
		}

		let count = 0;
		while (await undo()) count++;

		expect(count).toBe(MAX_HISTORY);
	});
});
