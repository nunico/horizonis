import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from './Toast.svelte';
import { toasts, showToast, clearToasts } from '$lib/stores/toast';
import { get } from 'svelte/store';

describe('Toast component', () => {
	beforeEach(() => {
		clearToasts();
	});

	it('renders an active toast message', async () => {
		render(Toast);
		showToast('Cluster saved', 'success', 0);

		expect(await screen.findByText('Cluster saved')).toBeInTheDocument();
	});

	it('uses role="alert" for errors and role="status" otherwise', async () => {
		render(Toast);
		showToast('Save failed', 'error', 0);
		showToast('Generating', 'info', 0);

		expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
		expect(screen.getByRole('status')).toHaveTextContent('Generating');
	});

	it('dismisses a toast when its close button is clicked', async () => {
		render(Toast);
		showToast('Dismiss me', 'info', 0);

		const button = await screen.findByLabelText('Dismiss notification');
		await fireEvent.click(button);

		expect(get(toasts)).toHaveLength(0);
		expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
	});
});
