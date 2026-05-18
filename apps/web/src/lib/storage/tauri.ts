import type { StarCluster } from '../types/stellar';
import type { StorageProvider } from './index';

export class TauriStorage implements StorageProvider {
	async getCluster(): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<StarCluster>('get_cluster');
	}

	async saveCluster(cluster: StarCluster): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('save_cluster', { cluster });
	}

	async generateCluster(seed?: bigint): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		// Seed can be null, Tauri will handle it
		return await invoke<StarCluster>('generate_cluster', { seed: seed ? Number(seed) : null });
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<string[]>('find_portal_route', { startId, endId });
	}
}
