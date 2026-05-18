import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { cluster, loadCluster, saveCluster } from './clusterData';

// Mock procedural-gen
vi.mock('procedural-gen', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	generate_cluster: vi.fn().mockReturnValue({ Name: 'Generated', Systems: [] })
}));

describe('clusterData store', () => {
	beforeEach(() => {
		cluster.set(null);
		vi.clearAllMocks();
		// @ts-ignore
		delete window.__TAURI_INTERNALS__;
		localStorage.clear();
	});

	it('loads cluster data from browser storage when not in Tauri', async () => {
		const mockData = { Name: 'Test Cluster', Systems: [] };
		localStorage.setItem('horizonis_cluster', JSON.stringify(mockData));

		await loadCluster();

		expect(get(cluster)).toEqual(mockData);
	});

	it('generates new cluster when browser storage is empty', async () => {
		await loadCluster();

		expect(get(cluster)).toEqual({ Name: 'Generated', Systems: [] });
		expect(localStorage.getItem('horizonis_cluster')).not.toBeNull();
	});

	it('saves cluster data to browser storage', async () => {
		const mockData = { Name: 'New Cluster', Systems: [] };
		await saveCluster(mockData);

		expect(get(cluster)).toEqual(mockData);
		expect(JSON.parse(localStorage.getItem('horizonis_cluster')!)).toEqual(mockData);
	});
});
