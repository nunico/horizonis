import type { StarCluster } from '../types/stellar';
import type { StorageProvider } from './index';
export class BrowserStorage implements StorageProvider {
	private readonly STORAGE_KEY = 'horizonis_cluster';

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

	async generateCluster(seed?: bigint): Promise<StarCluster> {
		const { generate_cluster } = await import('procedural-gen');
		const s = seed ?? BigInt(Math.floor(Math.random() * 1000000));
		const cluster = generate_cluster(s);
		await this.saveCluster(cluster);
		return cluster;
	}

	async computeRoute(startId: string, endId: string): Promise<string[]> {
		const { compute_route } = await import('procedural-gen');
		const cluster = await this.getCluster();
		return compute_route(cluster, startId, endId);
	}
}
