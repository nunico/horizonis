import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { cluster, loadCluster, saveCluster } from './clusterData';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('clusterData store', () => {
	beforeEach(() => {
		cluster.set(null);
		vi.clearAllMocks();
	});

	it('loads cluster data correctly', async () => {
		const mockData = { name: 'Test Cluster', systems: [] };
		vi.mocked(invoke).mockResolvedValue(mockData);

		await loadCluster();

		expect(invoke).toHaveBeenCalledWith('get_cluster');
		expect(get(cluster)).toEqual(mockData);
	});

	it('saves cluster data correctly', async () => {
		const mockData = { name: 'New Cluster', systems: [] };
		vi.mocked(invoke).mockResolvedValue(undefined);

		await saveCluster(mockData);

		expect(invoke).toHaveBeenCalledWith('save_cluster', { cluster: mockData });
		expect(get(cluster)).toEqual(mockData);
	});

	it('handles errors during load', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(invoke).mockRejectedValue(new Error('Failed'));

		await loadCluster();

		expect(get(cluster)).toBeNull();
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
