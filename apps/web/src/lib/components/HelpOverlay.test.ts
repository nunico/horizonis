import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import HelpOverlay from './HelpOverlay.svelte';

describe('HelpOverlay component', () => {
	it('does not render when show is false', () => {
		render(HelpOverlay, { show: false });
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});

	it('renders when show is true', () => {
		render(HelpOverlay, { show: true });
		expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
		expect(screen.getByText('Focus search')).toBeInTheDocument();
		expect(screen.getByText('/')).toBeInTheDocument();
	});

	it('toggles on "?" keydown', async () => {
		render(HelpOverlay, { show: false });

		await fireEvent.keyDown(window, { key: '?' });
		expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

		await fireEvent.keyDown(window, { key: '?' });
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});

	it('closes on Escape keydown', async () => {
		render(HelpOverlay, { show: true });

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});

	it('closes on close button click', async () => {
		render(HelpOverlay, { show: true });

		const closeButton = screen.getByLabelText('Close');
		await fireEvent.click(closeButton);
		expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
	});
});
