import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import Navigation from './Navigation.svelte';
import { activeSystemId, selectedEntity, viewMode } from '../stores/appState';
import { cluster } from '../stores/clusterData';
import type { StarCluster } from '../types/stellar';

const mockCluster: StarCluster = {
	Name: 'Test Cluster',
	Systems: [
		{
			Id: 'sys-1',
			Name: 'Alpha Centauri',
			X: 100,
			Y: 200,
			Stars: [],
			OrbitalBodies: [],
			OrbitalRegions: [],
			Portals: []
		}
	]
} as unknown as StarCluster;

describe('Navigation component', () => {
	beforeEach(() => {
		cluster.set(mockCluster);
		viewMode.set('cluster');
		activeSystemId.set(null);
		selectedEntity.set(null);
	});

	it('renders Cluster breadcrumb by default', () => {
		render(Navigation);

		expect(screen.getByRole('button', { name: /cluster/i })).toBeInTheDocument();
		expect(screen.queryByText('Alpha Centauri')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
	});

	it('renders system name when activeSystemId is set and found in cluster', () => {
		activeSystemId.set('sys-1');
		viewMode.set('system');

		render(Navigation);

		expect(screen.getByText('Alpha Centauri')).toBeInTheDocument();
	});

	it('renders entity name when selectedEntity is set', () => {
		activeSystemId.set('sys-1');
		viewMode.set('system');
		selectedEntity.set({
			Id: 'entity-1',
			Name: 'Gaia Prime',
			BodyType: 'Planet',
			OrbitAu: 1,
			RadiusKm: 6371,
			MassEarth: 1,
			Satellites: [],
			Tags: []
		} as any);

		render(Navigation);

		expect(screen.getByText('Gaia Prime')).toBeInTheDocument();
	});

	it('back button clears selectedEntity first, then switches to cluster view', async () => {
		activeSystemId.set('sys-1');
		viewMode.set('system');
		selectedEntity.set({
			Id: 'entity-1',
			Name: 'Gaia Prime',
			BodyType: 'Planet',
			OrbitAu: 1,
			RadiusKm: 6371,
			MassEarth: 1,
			Satellites: [],
			Tags: []
		} as any);

		render(Navigation);

		const backButton = screen.getByLabelText('Go back');
		expect(backButton).toBeInTheDocument();

		await fireEvent.click(backButton);
		expect(get(selectedEntity)).toBeNull();
		expect(get(viewMode)).toBe('system');
		expect(get(activeSystemId)).toBe('sys-1');

		await fireEvent.click(backButton);
		expect(get(viewMode)).toBe('cluster');
		expect(get(activeSystemId)).toBeNull();
	});

	it('Cluster breadcrumb click resets selection and navigates to cluster', async () => {
		activeSystemId.set('sys-1');
		viewMode.set('system');
		selectedEntity.set({
			Id: 'entity-1',
			Name: 'Gaia Prime',
			BodyType: 'Planet',
			OrbitAu: 1,
			RadiusKm: 6371,
			MassEarth: 1,
			Satellites: [],
			Tags: []
		} as any);

		render(Navigation);

		await fireEvent.click(screen.getByRole('button', { name: /cluster/i }));

		expect(get(selectedEntity)).toBeNull();
		expect(get(activeSystemId)).toBeNull();
		expect(get(viewMode)).toBe('cluster');
	});

	it('filters and displays search results', async () => {
		vi.useFakeTimers();
		render(Navigation);

		const input = screen.getByPlaceholderText(/search systems/i);
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Alpha' } });
		
		vi.advanceTimersByTime(200);

		expect(screen.getByText('Alpha Centauri')).toBeInTheDocument();
		expect(screen.getByText('system')).toBeInTheDocument();
		vi.useRealTimers();
	});

	it('selects search result and navigates', async () => {
		vi.useFakeTimers();
		render(Navigation);

		const input = screen.getByPlaceholderText(/search systems/i);
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Alpha' } });

		vi.advanceTimersByTime(200);

		const resultButton = screen.getByText('Alpha Centauri').closest('button');
		await fireEvent.click(resultButton!);

		expect(get(activeSystemId)).toBe('sys-1');
		expect(get(viewMode)).toBe('system');
		expect(get(selectedEntity)).toBeNull();
		expect(input).toHaveValue('');
		vi.useRealTimers();
	});

	it('focuses search input on "/" keydown', async () => {
		render(Navigation);
		const input = screen.getByPlaceholderText(/search systems/i);

		await fireEvent.keyDown(window, { key: '/' });
		expect(document.activeElement).toBe(input);
	});
});
