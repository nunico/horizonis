import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	toasts,
	toast,
	showToast,
	dismissToast,
	clearToasts,
	DEFAULT_TOAST_DURATION_MS
} from './toast';

describe('toast store', () => {
	beforeEach(() => {
		clearToasts();
		vi.useRealTimers();
	});

	it('adds a toast with the given message and type and returns its id', () => {
		const id = showToast('Saved', 'success');

		const list = get(toasts);
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ id, message: 'Saved', type: 'success' });
	});

	it('defaults the type to info when not specified', () => {
		showToast('Heads up');
		expect(get(toasts)[0].type).toBe('info');
	});

	it('assigns a unique id to each toast', () => {
		const a = showToast('one');
		const b = showToast('two');
		expect(a).not.toBe(b);
		expect(get(toasts)).toHaveLength(2);
	});

	it('removes a toast by id with dismissToast', () => {
		const a = showToast('one');
		const b = showToast('two');

		dismissToast(a);

		const ids = get(toasts).map((t) => t.id);
		expect(ids).toEqual([b]);
	});

	it('clears all toasts with clearToasts', () => {
		showToast('one');
		showToast('two');

		clearToasts();

		expect(get(toasts)).toEqual([]);
	});

	it('auto-dismisses a toast after its duration', () => {
		vi.useFakeTimers();
		showToast('temporary', 'info', 1000);
		expect(get(toasts)).toHaveLength(1);

		vi.advanceTimersByTime(1000);

		expect(get(toasts)).toHaveLength(0);
	});

	it('keeps a toast indefinitely when duration is 0', () => {
		vi.useFakeTimers();
		showToast('sticky', 'error', 0);

		vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS * 2);

		expect(get(toasts)).toHaveLength(1);
	});

	it('exposes typed convenience helpers', () => {
		toast.success('ok');
		toast.error('bad');
		toast.info('fyi');

		const types = get(toasts).map((t) => t.type);
		expect(types).toEqual(['success', 'error', 'info']);
	});
});
