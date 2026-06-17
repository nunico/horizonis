import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('pixi.js', () => ({
	Container: class {
		addChild() {}
	},
	Graphics: class {
		circle() {
			return this;
		}
		rect() {
			return this;
		}
		fill() {
			return this;
		}
		stroke() {
			return this;
		}
	}
}));

import StylePicker from './StylePicker.svelte';
import { activeStyleId, setActiveStyle, DEFAULT_STYLE_ID } from '$lib/stores/style';
import { toasts, clearToasts } from '$lib/stores/toast';

beforeEach(() => {
	localStorage.clear();
	clearToasts();
	setActiveStyle(DEFAULT_STYLE_ID);
});

describe('StylePicker', () => {
	it('lists the built-in styles when opened', async () => {
		render(StylePicker);
		await fireEvent.click(screen.getByRole('button', { name: /map style/i }));

		expect(screen.getByText('Realistic Star Field')).toBeInTheDocument();
		expect(screen.getByText('Tactical CRT')).toBeInTheDocument();
	});

	it('switches the active style when a style is chosen', async () => {
		render(StylePicker);
		await fireEvent.click(screen.getByRole('button', { name: /map style/i }));
		await fireEvent.click(screen.getByText('Tactical CRT'));

		expect(get(activeStyleId)).toBe('tactical');
	});

	it('shows an error toast when an invalid style file is imported', async () => {
		render(StylePicker);
		await fireEvent.click(screen.getByRole('button', { name: /map style/i }));

		const input = screen.getByTestId('style-import-input') as HTMLInputElement;
		const file = new File(['this is not json'], 'broken.json', { type: 'application/json' });
		Object.defineProperty(input, 'files', { value: [file] });
		await fireEvent.change(input);

		await vi.waitFor(() => {
			const list = get(toasts);
			expect(list.some((t) => t.type === 'error')).toBe(true);
		});
	});
});
