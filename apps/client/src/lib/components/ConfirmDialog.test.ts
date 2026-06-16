import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

const baseProps = {
	open: true,
	title: 'Generate new cluster?',
	message: 'This replaces your current data.',
	confirmLabel: 'Generate',
	onconfirm: () => {},
	oncancel: () => {}
};

describe('ConfirmDialog component', () => {
	it('does not render when open is false', () => {
		render(ConfirmDialog, { ...baseProps, open: false });
		expect(screen.queryByText('Generate new cluster?')).not.toBeInTheDocument();
	});

	it('renders the title, message and confirm label when open', () => {
		render(ConfirmDialog, baseProps);
		expect(screen.getByText('Generate new cluster?')).toBeInTheDocument();
		expect(screen.getByText('This replaces your current data.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
	});

	it('calls onconfirm when the confirm button is clicked', async () => {
		const onconfirm = vi.fn();
		render(ConfirmDialog, { ...baseProps, onconfirm });

		await fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
		expect(onconfirm).toHaveBeenCalledOnce();
	});

	it('calls oncancel when the cancel button is clicked', async () => {
		const oncancel = vi.fn();
		render(ConfirmDialog, { ...baseProps, oncancel });

		await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(oncancel).toHaveBeenCalledOnce();
	});

	it('disables both buttons while busy', () => {
		render(ConfirmDialog, { ...baseProps, busy: true });
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
	});

	it('does not cancel on Escape while busy', async () => {
		const oncancel = vi.fn();
		render(ConfirmDialog, { ...baseProps, busy: true, oncancel });

		await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(oncancel).not.toHaveBeenCalled();
	});

	it('cancels on Escape when not busy', async () => {
		const oncancel = vi.fn();
		render(ConfirmDialog, { ...baseProps, oncancel });

		await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(oncancel).toHaveBeenCalledOnce();
	});
});
