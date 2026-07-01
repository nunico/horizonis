import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { tick } from 'svelte';
import Navigation from './Navigation.svelte';
import { activeSystemId, selectedEntity, viewMode } from '$lib/stores/appState';
import { cluster, generateNewCluster } from '$lib/stores/clusterData';
import { helpOpen, requestSearchFocus } from '$lib/stores/ui';
import type { StarCluster } from '$lib/types/stellar';

vi.mock('$lib/stores/clusterData', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('$lib/stores/clusterData');
	return {
		...original,
		generateNewCluster: vi.fn()
	};
});

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
};

const { mockNativeConfirm } = vi.hoisted(() => ({
	mockNativeConfirm: vi.fn()
}));

vi.mock('$lib/platform/confirm', () => ({
	nativeConfirm: mockNativeConfirm
}));

describe('Navigation component', () => {
	beforeEach(() => {
		cluster.set(mockCluster);
		viewMode.set('cluster');
		activeSystemId.set(null);
		selectedEntity.set(null);
		vi.clearAllMocks();
		mockNativeConfirm.mockResolvedValue(null);
	});

	it('renders Cluster breadcrumb by default', () => {
		render(Navigation);

		expect(screen.getByRole('button', { name: /^cluster$/i })).toBeInTheDocument();
		expect(screen.queryByText('Alpha Centauri')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
	});

	it('renders a link to the generation settings page', () => {
		render(Navigation);

		const link = screen.getByRole('link', { name: /generation settings/i });
		expect(link).toHaveAttribute('href', '/settings');
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
		});

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
		});

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
		});

		render(Navigation);

		await fireEvent.click(screen.getByRole('button', { name: /^cluster$/i }));

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
		await tick();

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
		await tick();

		const resultButton = screen.getByText('Alpha Centauri').closest('button');
		await fireEvent.click(resultButton!);

		expect(get(activeSystemId)).toBe('sys-1');
		expect(get(viewMode)).toBe('system');
		expect(get(selectedEntity)).toBeNull();
		expect(input).toHaveValue('');
		vi.useRealTimers();
	});

	it('navigates results with arrow keys and selects with Enter', async () => {
		cluster.set({
			Name: 'Multi',
			Systems: [
				{
					Id: 'a',
					Name: 'Sol One',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				},
				{
					Id: 'b',
					Name: 'Sol Two',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
		vi.useFakeTimers();
		render(Navigation);

		const input = screen.getByPlaceholderText(/search systems/i);
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Sol' } });
		vi.advanceTimersByTime(200);
		await tick();

		// Default highlight is the first result; ArrowDown moves to the second.
		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(get(activeSystemId)).toBe('b');
		expect(get(viewMode)).toBe('system');
		vi.useRealTimers();
	});

	it('connects the search combobox to the active result for assistive technology', async () => {
		cluster.set({
			Name: 'Multi',
			Systems: [
				{
					Id: 'a',
					Name: 'Sol One',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				},
				{
					Id: 'b',
					Name: 'Sol Two',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
		vi.useFakeTimers();
		render(Navigation);

		const input = screen.getByRole('combobox');
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Sol' } });
		vi.advanceTimersByTime(200);
		await tick();

		expect(input).toHaveAttribute('aria-autocomplete', 'list');
		expect(input).toHaveAttribute('aria-activedescendant', 'search-result-system-a');
		expect(screen.getByRole('option', { name: /sol one/i })).toHaveAttribute(
			'id',
			'search-result-system-a'
		);

		await fireEvent.keyDown(input, { key: 'ArrowDown' });

		expect(input).toHaveAttribute('aria-activedescendant', 'search-result-system-b');
		vi.useRealTimers();
	});

	it('announces when a search has no results', async () => {
		vi.useFakeTimers();
		render(Navigation);

		const input = screen.getByRole('combobox');
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'zzz' } });
		vi.advanceTimersByTime(200);
		await tick();

		expect(screen.getByRole('status')).toHaveTextContent('No results found for "zzz"');
		vi.useRealTimers();
	});

	it('focuses search input when search focus is requested', async () => {
		render(Navigation);
		const input = screen.getByPlaceholderText(/search systems/i);

		requestSearchFocus();
		await tick();
		expect(document.activeElement).toBe(input);
	});

	it('opens the help overlay store when the help button is clicked', async () => {
		helpOpen.set(false);
		render(Navigation);

		await fireEvent.click(screen.getByLabelText('Help'));
		expect(get(helpOpen)).toBe(true);
	});

	it('handles invalid cluster state without crashing', () => {
		// Simulate cluster being an empty object (e.g. during partial load or error)
		cluster.set({} as unknown as StarCluster);
		render(Navigation);
		expect(screen.getByRole('button', { name: /^cluster$/i })).toBeInTheDocument();
	});

	it('regenerates after confirming in the in-app dialog', async () => {
		render(Navigation);

		await fireEvent.click(screen.getByLabelText('Generate New Cluster'));
		// Dialog appears; confirm it.
		await fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

		expect(generateNewCluster).toHaveBeenCalled();
	});

	it('regenerates after native confirmation accepts', async () => {
		mockNativeConfirm.mockResolvedValue(true);
		render(Navigation);

		await fireEvent.click(screen.getByLabelText('Generate New Cluster'));
		await tick();

		expect(mockNativeConfirm).toHaveBeenCalledWith({
			title: 'Generate a new cluster?',
			message: 'This replaces your current cluster. You can undo it right after.',
			confirmLabel: 'Generate',
			cancelLabel: 'Cancel',
			kind: 'warning'
		});
		expect(generateNewCluster).toHaveBeenCalled();
		expect(screen.queryByText('Generate a new cluster?')).not.toBeInTheDocument();
	});

	it('does not regenerate when the dialog is cancelled', async () => {
		render(Navigation);

		await fireEvent.click(screen.getByLabelText('Generate New Cluster'));
		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(generateNewCluster).not.toHaveBeenCalled();
		expect(screen.queryByText('Generate a new cluster?')).not.toBeInTheDocument();
	});
});
