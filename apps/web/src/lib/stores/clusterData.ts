import { writable } from 'svelte/store';
import { TauriStorage } from '../storage/tauri';
import { BrowserStorage } from '../storage/browser';
import type { StorageProvider } from '../storage';
import type { StarCluster } from '../types/stellar';
export const cluster = writable<StarCluster | null>(null);
export const isInitialized = writable(false);

let storage: StorageProvider;

async function getStorage() {
	if (storage) return storage;

	// @ts-ignore
	if (window.__TAURI_INTERNALS__) {
		storage = new TauriStorage();
	} else {
		storage = new BrowserStorage();
	}
	return storage;
}

export async function initWasm() {
	// @ts-ignore
	if (window.__TAURI_INTERNALS__) {
		isInitialized.set(true);
		return;
	}
	try {
		const { default: init } = await import('procedural-gen');
		await init();
		isInitialized.set(true);
	} catch (e) {
		console.error('Failed to init WASM:', e);
	}
}

export async function loadCluster() {
	const provider = await getStorage();
	try {
		const data = await provider.getCluster();
		cluster.set(data);
	} catch (e) {
		console.warn('Failed to load cluster, generating new one:', e);
		const newCluster = await provider.generateCluster();
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
