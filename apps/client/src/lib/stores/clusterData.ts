import { get, writable } from 'svelte/store';
import { getStorageProvider, _resetStorageProvider } from '$lib/storage/provider';
import type { StarCluster } from '$lib/types/stellar';
import { toast } from '$lib/stores/toast';
import { generationSettings } from '$lib/stores/generationSettings';

export const cluster = writable<StarCluster | null>(null);
export const isInitialized = writable(false);

export function _resetStorage() {
	_resetStorageProvider();
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
	const provider = await getStorageProvider();
	try {
		const data = await provider.getCluster();
		console.log('Cluster loaded from storage');
		cluster.set(applyE2EFixtureIfNeeded(data));
	} catch (e) {
		console.warn('Failed to load cluster, generating new one:', e);
		const newCluster = await provider.generateCluster(undefined, get(generationSettings));
		console.log('New cluster generated');
		cluster.set(applyE2EFixtureIfNeeded(newCluster));
	}
}

export async function saveCluster(data: StarCluster): Promise<boolean> {
	const provider = await getStorageProvider();
	try {
		await provider.saveCluster(data);
		cluster.set(data);
		return true;
	} catch (e) {
		console.error('Failed to save cluster:', e);
		toast.error('Failed to save changes');
		return false;
	}
}

export async function generateNewCluster(seed?: bigint) {
	console.log('Generating new cluster...');
	const provider = await getStorageProvider();
	try {
		const newCluster = await provider.generateCluster(seed, get(generationSettings));
		console.log('New cluster generated successfully');
		cluster.set(newCluster);
		return newCluster;
	} catch (e) {
		console.error('Failed to generate cluster:', e);
		toast.error('Failed to generate a new cluster');
		throw e;
	}
}

// If running under Playwright/WebDriver and the cluster has no systems,
// inject a tiny deterministic fixture so E2E tests can run instead of skipping.
function applyE2EFixtureIfNeeded(data: StarCluster): StarCluster {
	// Detect E2E: navigator.webdriver is true under Playwright; also honor a manual flag on window
	const win = typeof window !== 'undefined' ? (window as Window) : null;
	const isE2E = !!(
		win?.navigator?.webdriver ||
		win?.PUBLIC_E2E === '1' ||
		win?.PUBLIC_E2E === true
	);
	if (!isE2E) return data;

	// Prefer a fixture provided by the E2E harness to avoid shipping test data in the app bundle
	const fixture = (win?.__E2E_CLUSTER_FIXTURE as StarCluster | undefined) ?? undefined;

	if (fixture && Array.isArray(fixture.Systems) && fixture.Systems.length > 0) {
		// If the current data is empty or not the fixture, override it.
		// This ensures that even if a random cluster was generated, the fixture takes precedence.
		if (!data || !data.Systems || data.Systems.length === 0 || data.Name !== fixture.Name) {
			// Try to persist so page reloads keep the same data
			try {
				void saveCluster(fixture);
			} catch {
				// non-fatal in E2E
			}
			return fixture;
		}
	}

	if (Array.isArray(data?.Systems) && data.Systems.length > 0) return data;

	return data;
}
