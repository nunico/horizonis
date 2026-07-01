import type { StarCluster } from '$lib/types/stellar';
import type { GenerationSettings } from '$lib/types/generationSettings';

export interface StorageProvider {
	getCluster(): Promise<StarCluster>;
	saveCluster(cluster: StarCluster): Promise<void>;
	generateCluster(seed?: bigint, settings?: GenerationSettings): Promise<StarCluster>;
	computeRoute(startId: string, endId: string): Promise<string[]>;
	getGenerationSettings(): Promise<GenerationSettings>;
	saveGenerationSettings(settings: GenerationSettings): Promise<void>;
}
