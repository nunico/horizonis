import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import SettingsPage from './+page.svelte';
import { generationSettings } from '$lib/stores/generationSettings';
import { defaultGenerationSettings } from '$lib/types/generationSettings';

const { mockGoto, mockSaveGenerationSettings, mockRequestRegenerate } = vi.hoisted(() => ({
	mockGoto: vi.fn(),
	mockSaveGenerationSettings: vi.fn().mockResolvedValue(undefined),
	mockRequestRegenerate: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto
}));

vi.mock('$lib/stores/generationSettings', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('$lib/stores/generationSettings');
	return {
		...original,
		saveGenerationSettings: mockSaveGenerationSettings
	};
});

vi.mock('$lib/actions/regenerate', () => ({
	requestRegenerate: mockRequestRegenerate,
	performRegenerate: vi.fn().mockResolvedValue(undefined)
}));

describe('settings page', () => {
	beforeEach(() => {
		generationSettings.set(defaultGenerationSettings);
		vi.clearAllMocks();
	});

	it('renders the current settings values', () => {
		render(SettingsPage);

		expect(screen.getByLabelText(/minimum systems/i)).toHaveValue(15);
		expect(screen.getByLabelText(/maximum systems/i)).toHaveValue(25);
		expect(screen.getByLabelText(/max planets per star/i)).toHaveValue(8);
	});

	it('disables Save & Generate when the system count range is invalid', async () => {
		render(SettingsPage);

		const min = screen.getByLabelText(/minimum systems/i);
		await fireEvent.input(min, { target: { value: '30' } });

		expect(screen.getByRole('button', { name: /save & generate/i })).toBeDisabled();
		expect(screen.getByText(/minimum must be less than or equal to maximum/i)).toBeInTheDocument();
	});

	it('disables Save & Generate when max planets per star is cleared', async () => {
		render(SettingsPage);

		const maxBodies = screen.getByLabelText(/max planets per star/i);
		await fireEvent.input(maxBodies, { target: { value: '' } });

		expect(screen.getByRole('button', { name: /save & generate/i })).toBeDisabled();
		expect(
			screen.getByText(/max planets per star must be a non-negative number/i)
		).toBeInTheDocument();
	});

	it('saves settings and requests regeneration on Save & Generate', async () => {
		render(SettingsPage);

		const maxBodies = screen.getByLabelText(/max planets per star/i);
		await fireEvent.input(maxBodies, { target: { value: '4' } });
		await fireEvent.click(screen.getByRole('button', { name: /save & generate/i }));

		expect(mockSaveGenerationSettings).toHaveBeenCalledWith(
			expect.objectContaining({ MaxBodiesPerStar: 4 })
		);
		expect(mockRequestRegenerate).toHaveBeenCalledWith(
			expect.objectContaining({ onShowConfirm: expect.any(Function) })
		);
	});

	it('resets staged edits to defaults without saving', async () => {
		render(SettingsPage);

		const maxBodies = screen.getByLabelText(/max planets per star/i);
		await fireEvent.input(maxBodies, { target: { value: '2' } });
		await fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

		expect(screen.getByLabelText(/max planets per star/i)).toHaveValue(
			defaultGenerationSettings.MaxBodiesPerStar
		);
		expect(mockSaveGenerationSettings).not.toHaveBeenCalled();
	});

	it('navigates back without saving on Cancel', async () => {
		render(SettingsPage);

		await fireEvent.click(screen.getByRole('link', { name: /cancel/i }));

		expect(mockSaveGenerationSettings).not.toHaveBeenCalled();
	});
});
