import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	cluster,
	loadCluster,
	saveCluster,
	generateNewCluster,
	_resetStorage
} from './clusterData';

// Mock procedural-gen
vi.mock('procedural-gen', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	generate_cluster: vi.fn().mockReturnValue({ Name: 'Generated', Systems: [] })
}));

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('clusterData store', () => {
	beforeEach(() => {
		cluster.set(null);
		_resetStorage();
		vi.clearAllMocks();
		// @ts-expect-error - Mocking storage
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

	it('uses TauriStorage when __TAURI_INTERNALS__ is present', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		const mockData = { Name: 'Tauri Cluster', Systems: [] };
		vi.mocked(invoke).mockResolvedValue(mockData);

		// @ts-expect-error - Mocking
		window.__TAURI_INTERNALS__ = {};

		await loadCluster();

		expect(invoke).toHaveBeenCalledWith('get_cluster');
		expect(get(cluster)).toEqual(mockData);
	});

	it('falls back to generation when Tauri storage fails', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		vi.mocked(invoke).mockRejectedValueOnce(new Error('Tauri error'));
		const generatedData = { Name: 'Tauri Generated', Systems: [] };
		vi.mocked(invoke).mockResolvedValueOnce(generatedData);

		// @ts-expect-error - Mocking
		window.__TAURI_INTERNALS__ = {};

		await loadCluster();

		expect(invoke).toHaveBeenCalledWith('get_cluster');
		expect(invoke).toHaveBeenCalledWith('generate_cluster', { seed: null });
		expect(get(cluster)).toEqual(generatedData);
	});

	it('logs error when saveCluster fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		// Force failure in BrowserStorage by making localStorage.setItem throw
		vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
			throw new Error('Disk full');
		});

		const mockData = { Name: 'Fail Cluster', Systems: [] };
		await saveCluster(mockData);

		expect(consoleSpy).toHaveBeenCalledWith('Failed to save cluster:', expect.any(Error));
		consoleSpy.mockRestore();
	});

	it('manually generates a new cluster', async () => {
		await generateNewCluster();

		expect(get(cluster)).toEqual({ Name: 'Generated', Systems: [] });
		expect(localStorage.getItem('horizonis_cluster')).not.toBeNull();
	});

	it('manually generates a new cluster with a specific seed', async () => {
		const { generate_cluster } = await import('procedural-gen');
		const seed = BigInt(12345);

		await generateNewCluster(seed);

		expect(generate_cluster).toHaveBeenCalledWith(seed);
		expect(get(cluster)).toEqual({ Name: 'Generated', Systems: [] });
	});
});
