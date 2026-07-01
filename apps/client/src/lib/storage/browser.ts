import type { StarCluster } from '$lib/types/stellar';
import type { StorageProvider } from '$lib/storage';
import type { GenerationSettings } from '$lib/types/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';

export class BrowserStorage implements StorageProvider {
	private readonly STORAGE_KEY = 'horizonis_cluster';
	private readonly SETTINGS_KEY = 'horizonis_generation_settings';

	async getCluster(): Promise<StarCluster> {
		const data = localStorage.getItem(this.STORAGE_KEY);
		if (!data) {
			throw new Error('No cluster found in local storage');
		}
		return JSON.parse(data);
	}

	async saveCluster(cluster: StarCluster): Promise<void> {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cluster));
	}

	async generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster> {
		const { generate_cluster } = await import('procedural-gen');
		const s = seed ?? BigInt(Math.floor(Math.random() * 1000000));
		const cluster = generate_cluster(s, settings ?? defaultGenerationSettings);
		await this.saveCluster(cluster);
		return cluster;
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { compute_route } = await import('procedural-gen');
		const cluster = await this.getCluster();
		return compute_route(cluster, startId, endId);
	}

	async getGenerationSettings(): Promise<GenerationSettings> {
		const data = localStorage.getItem(this.SETTINGS_KEY);
		if (!data) return defaultGenerationSettings;
		try {
			return JSON.parse(data);
		} catch {
			return defaultGenerationSettings;
		}
	}

	async saveGenerationSettings(settings: GenerationSettings): Promise<void> {
		localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
	}
}
