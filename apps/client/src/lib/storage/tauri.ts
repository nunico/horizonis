import type { StarCluster } from '$lib/types/stellar';
import type { StorageProvider } from '$lib/storage';
import type { GenerationSettings } from '$lib/types/generationSettings';

export class TauriStorage implements StorageProvider {
	async getCluster(): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<StarCluster>('get_cluster');
	}

	async saveCluster(cluster: StarCluster): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('save_cluster', { cluster });
	}

	async generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster> {
		const { invoke } = await import('@tauri-apps/api/core');
		// Seed can be null, Tauri will handle it
		return await invoke<StarCluster>('generate_cluster', {
			seed: seed ? Number(seed) : null,
			settings: settings ?? null
		});
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<string[]>('find_portal_route', { startId, endId });
	}

	async getGenerationSettings(): Promise<GenerationSettings> {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<GenerationSettings>('get_generation_settings');
	}

	async saveGenerationSettings(settings: GenerationSettings): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('save_generation_settings', { settings });
	}
}
