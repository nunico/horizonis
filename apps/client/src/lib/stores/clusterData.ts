import { writable } from 'svelte/store';
import { TauriStorage } from '$lib/storage/tauri';
import { BrowserStorage } from '$lib/storage/browser';
import type { StorageProvider } from '$lib/storage';
import type { StarCluster } from '$lib/types/stellar';
export const cluster = writable<StarCluster | null>(null);
export const isInitialized = writable(false);

let storage: StorageProvider | null = null;

export function _resetStorage() {
	storage = null;
}

async function getStorage() {
	if (storage) return storage;

	// @ts-expect-error - Tauri global
	if (window.__TAURI_INTERNALS__) {
		storage = new TauriStorage();
	} else {
		storage = new BrowserStorage();
	}
	return storage;
}

export async function initWasm() {
	// @ts-expect-error - Tauri global
	if (window.__TAURI_INTERNALS__) {
		isInitialized.set(true);
		return;
	}
	try {
		console.log('Initializing WASM...');
		const [{ default: init }, { default: wasmUrl }] = await Promise.all([
			import('procedural-gen'),
			import('procedural-gen/procedural_gen_bg.wasm?url') as Promise<{ default: string }>
		]);
		await init(wasmUrl);
		console.log('WASM initialized successfully');
		isInitialized.set(true);
	} catch (e) {
		console.error('Failed to init WASM:', e);
	}
}

export async function loadCluster() {
	console.log('Loading cluster...');
	const provider = await getStorage();
	try {
		const data = await provider.getCluster();
		console.log('Cluster loaded from storage');
		cluster.set(data);
	} catch (e) {
		console.warn('Failed to load cluster, generating new one:', e);
		const newCluster = await provider.generateCluster();
		console.log('New cluster generated');
		cluster.set(newCluster);
	}
}

export async function saveCluster(data: StarCluster) {
	const provider = await getStorage();
	try {
		await provider.saveCluster(data);
		cluster.set(data);
	} catch (e) {
		console.error('Failed to save cluster:', e);
	}
}
