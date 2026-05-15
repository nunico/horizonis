import { writable } from 'svelte/store';

export type ViewMode = 'cluster' | 'system';

export const viewMode = writable<ViewMode>('cluster');
export const activeSystemId = writable<string | null>(null);
export const selectedEntity = writable<any | null>(null);
