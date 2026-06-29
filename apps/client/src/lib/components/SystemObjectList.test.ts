import { beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SystemObjectList from './SystemObjectList.svelte';
import { cluster } from '$lib/stores/clusterData';
import { activeSystemId, selectedEntity } from '$lib/stores/appState';
import type { StarCluster } from '$lib/types/stellar';

const mockCluster: StarCluster = {
	Name: 'Object Test Cluster',
	Systems: [
		{
			Id: 'sys-1',
			Name: 'Alpha System',
			X: 0,
			Y: 0,
			Stars: [
				{
					Id: 'star-1',
					Name: 'Alpha Star',
					SpectralClass: 'G2V',
					RadiusSol: 1,
					MassSol: 1,
					OrbitAu: 0,
					OrbitalRegions: [],
					Satellites: [
						{
							Id: 'star-planet-1',
							Name: 'Star Planet',
							BodyType: 'Planet',
							OrbitAu: 0.4,
							RadiusKm: 5000,
							MassEarth: 0.5,
							Tags: [],
							Satellites: []
						}
					]
				}
			],
			OrbitalBodies: [
				{
					Id: 'planet-1',
					Name: 'Gaia Prime',
					BodyType: 'Planet',
					OrbitAu: 1,
					RadiusKm: 6371,
					MassEarth: 1,
					Tags: [],
					Satellites: [
						{
							Id: 'moon-1',
							Name: 'Gaia Moon',
							BodyType: 'Moon',
							OrbitAu: 0.01,
							RadiusKm: 1700,
							MassEarth: 0.01,
							Tags: [],
							Satellites: []
						}
					]
				}
			],
			OrbitalRegions: [],
			Portals: []
		}
	]
};

describe('SystemObjectList component', () => {
	beforeEach(() => {
		cluster.set(mockCluster);
		activeSystemId.set('sys-1');
		selectedEntity.set(null);
	});

	it('renders stars, bodies, and nested satellites as keyboard-selectable buttons', async () => {
		render(SystemObjectList);

		await fireEvent.click(screen.getByRole('button', { name: /system objects/i }));

		expect(screen.getByRole('button', { name: /star: alpha star/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /planet: star planet/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /planet: gaia prime/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /moon: gaia moon/i })).toBeInTheDocument();
	});

	it('selects the same entity used by the Inspector flow', async () => {
		render(SystemObjectList);

		await fireEvent.click(screen.getByRole('button', { name: /system objects/i }));
		await fireEvent.click(screen.getByRole('button', { name: /moon: gaia moon/i }));

		expect(get(selectedEntity)?.Id).toBe('moon-1');
	});
});
