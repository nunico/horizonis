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
		cluster.set(applyE2EFixtureIfNeeded(data));
	} catch (e) {
		console.warn('Failed to load cluster, generating new one:', e);
		const newCluster = await provider.generateCluster();
		console.log('New cluster generated');
		cluster.set(applyE2EFixtureIfNeeded(newCluster));
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

// If running under Playwright/WebDriver and the cluster has no systems,
// inject a tiny deterministic fixture so E2E tests can run instead of skipping.
function applyE2EFixtureIfNeeded(data: StarCluster): StarCluster {
	// Detect E2E: navigator.webdriver is true under Playwright; also honor a manual flag on window
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const win = typeof window !== 'undefined' ? (window as unknown as any) : null;
	const isE2E = !!(
		win?.navigator?.webdriver ||
		win?.PUBLIC_E2E === '1' ||
		win?.PUBLIC_E2E === true
	);
	if (!isE2E) return data;

	if (Array.isArray(data?.Systems) && data.Systems.length > 0) return data;

	// Prefer a fixture provided by the E2E harness to avoid shipping test data in the app bundle
	const fixture = (win?.__E2E_CLUSTER_FIXTURE as StarCluster | undefined) ?? undefined;
	if (fixture && Array.isArray(fixture.Systems) && fixture.Systems.length > 0) {
		// Try to persist so page reloads keep the same data
		try {
			void saveCluster(fixture);
		} catch {
			// non-fatal in E2E
		}
		return fixture;
	}

	// No external fixture provided — return the original data (tests may skip if empty)
	return data;
}
