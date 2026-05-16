import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Inspector from './Inspector.svelte';
import { selectedEntity } from '../stores/appState';
import { cluster } from '../stores/clusterData';
import { type StarCluster } from '../types/stellar';
import { get } from 'svelte/store';

describe('Inspector component', () => {
	beforeEach(() => {
		selectedEntity.set(null);
		cluster.set({
			name: 'Test Cluster',
			systems: [
				{
					id: 'sys-1',
					name: 'Old Name',
					x: 0,
					y: 0,
					stars: [],
					orbital_bodies: [],
					orbital_regions: [],
					portals: []
				}
			]
		} as StarCluster);
	});

	it('does not render when no entity is selected', () => {
		render(Inspector);
		expect(screen.queryByText('Inspector')).not.toBeInTheDocument();
	});

	it('renders when an entity is selected', async () => {
		selectedEntity.set(get(cluster)!.systems[0]);
		render(Inspector);
		expect(screen.getByText('Inspector')).toBeInTheDocument();
		expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
	});

	it('updates the store when saved', async () => {
		const system = get(cluster)!.systems[0];
		selectedEntity.set(system);
		render(Inspector);

		const input = screen.getByDisplayValue('Old Name');
		await fireEvent.input(input, { target: { value: 'New Name' } });

		const saveButton = screen.getByText('Save Changes');
		await fireEvent.click(saveButton);

		expect(get(cluster)!.systems[0].name).toBe('New Name');
		expect(get(selectedEntity)).toBeNull();
	});
});
