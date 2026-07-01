import { writable } from 'svelte/store';
import { getStorageProvider } from '$lib/storage/provider';
import type { GenerationSettings } from '$lib/types/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';
import { toast } from '$lib/stores/toast';

export const generationSettings = writable<GenerationSettings>(defaultGenerationSettings);

export async function loadGenerationSettings(): Promise<GenerationSettings> {
	const provider = await getStorageProvider();
	try {
		const settings = await provider.getGenerationSettings();
		generationSettings.set(settings);
		return settings;
	} catch (e) {
		console.warn('Failed to load generation settings, using defaults:', e);
		generationSettings.set(defaultGenerationSettings);
		return defaultGenerationSettings;
	}
}

export async function saveGenerationSettings(settings: GenerationSettings): Promise<void> {
	const provider = await getStorageProvider();
	try {
		await provider.saveGenerationSettings(settings);
		generationSettings.set(settings);
	} catch (e) {
		console.error('Failed to save generation settings:', e);
		toast.error('Failed to save generation settings');
		throw e;
	}
}
