import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { load } from './+layout';
import { generationSettings } from '$lib/stores/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';
import { _resetStorageProvider } from '$lib/storage/provider';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('root layout load', () => {
	beforeEach(() => {
		generationSettings.set(defaultGenerationSettings);
		_resetStorageProvider();
		vi.clearAllMocks();
		// @ts-expect-error - Mocking storage
		delete window.__TAURI_INTERNALS__;
		localStorage.clear();
	});

	it('loads settings persisted in browser storage into the store', async () => {
		const saved = { ...defaultGenerationSettings, SystemCountMin: 5, SystemCountMax: 10 };
		localStorage.setItem('horizonis_generation_settings', JSON.stringify(saved));

		await load();

		expect(get(generationSettings)).toEqual(saved);
	});

	it('falls back to defaults when browser storage is empty', async () => {
		await load();

		expect(get(generationSettings)).toEqual(defaultGenerationSettings);
	});

	it('falls back to defaults when browser storage is corrupt', async () => {
		localStorage.setItem('horizonis_generation_settings', 'not json');

		await load();

		expect(get(generationSettings)).toEqual(defaultGenerationSettings);
	});
});
