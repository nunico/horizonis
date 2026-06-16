import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import HelpOverlay from './HelpOverlay.svelte';
import { helpOpen } from '$lib/stores/ui';

describe('HelpOverlay component', () => {
	beforeEach(() => {
		helpOpen.set(false);
	});

	it('does not render when helpOpen is false', () => {
		render(HelpOverlay);
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});

	it('renders when helpOpen is true', () => {
		helpOpen.set(true);
		render(HelpOverlay);
		expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
		expect(screen.getByText('Focus search')).toBeInTheDocument();
		expect(screen.getByText('/')).toBeInTheDocument();
	});

	it('documents the double-click-to-open gesture', () => {
		helpOpen.set(true);
		render(HelpOverlay);
		expect(screen.getByText('Open a system (Star Map)')).toBeInTheDocument();
	});

	it('documents undo and the search/drag interactions', () => {
		helpOpen.set(true);
		render(HelpOverlay);
		expect(screen.getByText('Undo last change')).toBeInTheDocument();
		expect(screen.getByText('Navigate / pick a search result')).toBeInTheDocument();
		expect(screen.getByText('Rearrange it (Star Map only)')).toBeInTheDocument();
	});

	it('closes (clears the store) on close button click', async () => {
		helpOpen.set(true);
		render(HelpOverlay);

		await fireEvent.click(screen.getByLabelText('Close'));

		expect(get(helpOpen)).toBe(false);
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});
});
