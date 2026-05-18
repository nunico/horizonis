import type { StarCluster } from '../types/stellar';

export interface StorageProvider {
	getCluster(): Promise<StarCluster>;
	saveCluster(cluster: StarCluster): Promise<void>;
	generateCluster(seed?: bigint): Promise<StarCluster>;
	computeRoute(startId: string, endId: string): Promise<string[]>;
}
