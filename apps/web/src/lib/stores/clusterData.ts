import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { StarCluster } from '../types/stellar';

export const cluster = writable<StarCluster | null>(null);

export async function loadCluster() {
	try {
		const data = await invoke<StarCluster>('get_cluster');
		cluster.set(data);
	} catch (e) {
		console.error('Failed to load cluster:', e);
	}
}

export async function saveCluster(data: StarCluster) {
	try {
		await invoke('save_cluster', { cluster: data });
		cluster.set(data);
	} catch (e) {
		console.error('Failed to save cluster:', e);
	}
}
