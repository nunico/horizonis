import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	generationSettings,
	loadGenerationSettings,
	saveGenerationSettings
} from './generationSettings';
import { _resetStorageProvider } from '$lib/storage/provider';
import { defaultGenerationSettings } from '$lib/types/generationSettings';
import { clearToasts } from './toast';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('generationSettings store', () => {
	beforeEach(() => {
		generationSettings.set(defaultGenerationSettings);
		_resetStorageProvider();
		clearToasts();
		vi.clearAllMocks();
		// @ts-expect-error - Mocking storage
		delete window.__TAURI_INTERNALS__;
		localStorage.clear();
	});

	it('falls back to defaults when browser storage is empty', async () => {
		const settings = await loadGenerationSettings();

		expect(settings).toEqual(defaultGenerationSettings);
		expect(get(generationSettings)).toEqual(defaultGenerationSettings);
	});

	it('falls back to defaults when browser storage is corrupt', async () => {
		localStorage.setItem('horizonis_generation_settings', 'not json');

		const settings = await loadGenerationSettings();

		expect(settings).toEqual(defaultGenerationSettings);
	});

	it('loads previously saved settings from browser storage', async () => {
		const saved = { ...defaultGenerationSettings, SystemCountMin: 5, SystemCountMax: 10 };
		localStorage.setItem('horizonis_generation_settings', JSON.stringify(saved));

		const settings = await loadGenerationSettings();

		expect(settings).toEqual(saved);
	});

	it('saves settings to browser storage and updates the store', async () => {
		const updated = { ...defaultGenerationSettings, MultiStarChance: 0.5 };

		await saveGenerationSettings(updated);

		expect(get(generationSettings)).toEqual(updated);
		expect(JSON.parse(localStorage.getItem('horizonis_generation_settings')!)).toEqual(updated);
	});

	it('uses TauriStorage when __TAURI_INTERNALS__ is present', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		// @ts-expect-error - Mocking Tauri global
		window.__TAURI_INTERNALS__ = {};
		vi.mocked(invoke).mockResolvedValueOnce(defaultGenerationSettings);

		const settings = await loadGenerationSettings();

		expect(invoke).toHaveBeenCalledWith('get_generation_settings');
		expect(settings).toEqual(defaultGenerationSettings);
	});

	it('saves via TauriStorage when __TAURI_INTERNALS__ is present', async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		// @ts-expect-error - Mocking Tauri global
		window.__TAURI_INTERNALS__ = {};
		const updated = { ...defaultGenerationSettings, TrinaryRatio: 0.5 };

		await saveGenerationSettings(updated);

		expect(invoke).toHaveBeenCalledWith('save_generation_settings', { settings: updated });
	});
});
