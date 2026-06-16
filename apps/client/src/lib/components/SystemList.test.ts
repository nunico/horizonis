import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SystemList from './SystemList.svelte';
import { cluster } from '$lib/stores/clusterData';
import { activeSystemId, viewMode, selectedEntity } from '$lib/stores/appState';
import type { StarCluster } from '$lib/types/stellar';

const mkSystem = (id: string, name: string) => ({
	Id: id,
	Name: name,
	X: 0,
	Y: 0,
	Stars: [],
	OrbitalBodies: [],
	OrbitalRegions: [],
	Portals: []
});

const fixture: StarCluster = {
	Name: 'C',
	Systems: [mkSystem('s1', 'Sol'), mkSystem('s2', 'Vega')]
};

describe('SystemList component', () => {
	beforeEach(() => {
		cluster.set(fixture);
		viewMode.set('cluster');
		activeSystemId.set(null);
		selectedEntity.set(null);
	});

	it('exposes a labelled Systems navigation landmark with a count', () => {
		render(SystemList);
		expect(screen.getByRole('navigation', { name: 'Systems' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /systems \(2\)/i })).toBeInTheDocument();
	});

	it('lists systems only after expanding the disclosure', async () => {
		render(SystemList);
		expect(screen.queryByRole('button', { name: 'Vega' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /systems \(2\)/i }));

		expect(screen.getByRole('button', { name: 'Sol' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Vega' })).toBeInTheDocument();
	});

	it('opens a system when its button is activated', async () => {
		render(SystemList);
		await fireEvent.click(screen.getByRole('button', { name: /systems \(2\)/i }));
		await fireEvent.click(screen.getByRole('button', { name: 'Vega' }));

		expect(get(activeSystemId)).toBe('s2');
		expect(get(viewMode)).toBe('system');
		expect(get(selectedEntity)).toBeNull();
	});
});
