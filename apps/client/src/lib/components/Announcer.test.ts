import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Announcer from './Announcer.svelte';
import { cluster } from '$lib/stores/clusterData';
import { activeSystemId, viewMode } from '$lib/stores/appState';
import type { StarCluster } from '$lib/types/stellar';

const fixture: StarCluster = {
	Name: 'C',
	Systems: [
		{
			Id: 's1',
			Name: 'Sol',
			X: 0,
			Y: 0,
			Stars: [],
			OrbitalBodies: [],
			OrbitalRegions: [],
			Portals: []
		}
	]
};

describe('Announcer component', () => {
	beforeEach(() => {
		cluster.set(fixture);
		viewMode.set('cluster');
		activeSystemId.set(null);
	});

	it('announces the cluster view by default in a polite live region', () => {
		render(Announcer);
		const region = screen.getByTestId('announcer');
		expect(region).toHaveAttribute('aria-live', 'polite');
		expect(region).toHaveTextContent('Viewing star cluster');
	});

	it('announces the active system by name in system view', async () => {
		activeSystemId.set('s1');
		viewMode.set('system');
		render(Announcer);
		expect(screen.getByTestId('announcer')).toHaveTextContent('Viewing Sol system');
	});
});
