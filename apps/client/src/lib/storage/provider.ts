import { TauriStorage } from './tauri';
import { BrowserStorage } from './browser';
import type { StorageProvider } from './index';

let storage: StorageProvider | null = null;

export function _resetStorageProvider(): void {
	storage = null;
}

export async function getStorageProvider(): Promise<StorageProvider> {
	if (storage) return storage;

	// @ts-expect-error - Tauri global
	if (window.__TAURI_INTERNALS__) {
		storage = new TauriStorage();
	} else {
		storage = new BrowserStorage();
	}
	return storage;
}
