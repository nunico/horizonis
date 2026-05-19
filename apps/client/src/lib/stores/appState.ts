import { writable } from 'svelte/store';
import type { SolarSystem, Star, OrbitalBody } from '$lib/types/stellar';

export type ViewMode = 'cluster' | 'system';
export type Entity = SolarSystem | Star | OrbitalBody;

export const viewMode = writable<ViewMode>('cluster');
export const activeSystemId = writable<string | null>(null);
export const selectedEntity = writable<Entity | null>(null);
