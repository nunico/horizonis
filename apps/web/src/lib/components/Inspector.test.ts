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
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys-1',
					Name: 'Old Name',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		} as unknown as StarCluster);
	});

	it('does not render when no entity is selected', () => {
		render(Inspector);
		expect(screen.queryByText('Inspector')).not.toBeInTheDocument();
	});

	it('renders when an entity is selected', async () => {
		selectedEntity.set(get(cluster)!.Systems[0]);
		render(Inspector);
		expect(screen.getByText('Inspector')).toBeInTheDocument();
		expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
	});

	it('updates the store when saved', async () => {
		const system = get(cluster)!.Systems[0];
		selectedEntity.set(system);
		render(Inspector);

		const input = screen.getByDisplayValue('Old Name');
		await fireEvent.input(input, { target: { value: 'New Name' } });

		const saveButton = screen.getByText('Save Changes');
		await fireEvent.click(saveButton);

		expect(get(cluster)!.Systems[0].Name).toBe('New Name');
		expect(get(selectedEntity)).toBeNull();
	});

	it('saves on Enter keydown', async () => {
		const system = get(cluster)!.Systems[0];
		selectedEntity.set(system);
		render(Inspector);

		const input = screen.getByDisplayValue('Old Name');
		await fireEvent.input(input, { target: { value: 'Key Name' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(get(cluster)!.Systems[0].Name).toBe('Key Name');
		expect(get(selectedEntity)).toBeNull();
	});

	it('closes on Escape keydown', async () => {
		selectedEntity.set(get(cluster)!.Systems[0]);
		render(Inspector);

		const inspector = screen.getByText('Inspector').closest('div');
		await fireEvent.keyDown(inspector!, { key: 'Escape' });

		expect(get(selectedEntity)).toBeNull();
	});

	it('focuses the name input on mount', async () => {
		selectedEntity.set(get(cluster)!.Systems[0]);
		render(Inspector);

		const input = screen.getByDisplayValue('Old Name');
		expect(document.activeElement).toBe(input);
	});
});
