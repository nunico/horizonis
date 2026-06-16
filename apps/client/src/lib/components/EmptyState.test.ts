import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EmptyState from './EmptyState.svelte';

vi.mock('$lib/stores/clusterData', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('$lib/stores/clusterData');
	return {
		...original,
		generateNewCluster: vi.fn().mockResolvedValue({ Name: 'Generated', Systems: [] })
	};
});

import { generateNewCluster } from '$lib/stores/clusterData';

describe('EmptyState component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders an explanatory message and a generate action', () => {
		render(EmptyState);
		expect(screen.getByText('No systems yet')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /generate a cluster/i })).toBeInTheDocument();
	});

	it('generates a new cluster when the button is clicked', async () => {
		render(EmptyState);

		await fireEvent.click(screen.getByRole('button', { name: /generate a cluster/i }));

		expect(generateNewCluster).toHaveBeenCalledOnce();
	});
});
