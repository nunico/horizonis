import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

/** How long a toast stays on screen before auto-dismissing (ms). */
export const DEFAULT_TOAST_DURATION_MS = 4000;

/** Active toast queue, newest last. Consumed by Toast.svelte. */
export const toasts = writable<Toast[]>([]);

let nextId = 0;

/**
 * Enqueue a toast.
 * @param durationMs auto-dismiss delay; pass 0 to keep it until dismissed.
 * @returns the toast id (use with {@link dismissToast}).
 */
export function showToast(
	message: string,
	type: ToastType = 'info',
	durationMs: number = DEFAULT_TOAST_DURATION_MS
): number {
	const id = ++nextId;
	toasts.update((list) => [...list, { id, message, type }]);

	if (durationMs > 0) {
		setTimeout(() => dismissToast(id), durationMs);
	}

	return id;
}

/** Remove a toast by id. No-op if it has already been dismissed. */
export function dismissToast(id: number): void {
	toasts.update((list) => list.filter((t) => t.id !== id));
}

/** Remove every toast. */
export function clearToasts(): void {
	toasts.set([]);
}

/** Convenience helpers that fix the toast type. */
export const toast = {
	success: (message: string, durationMs?: number) => showToast(message, 'success', durationMs),
	error: (message: string, durationMs?: number) => showToast(message, 'error', durationMs),
	info: (message: string, durationMs?: number) => showToast(message, 'info', durationMs)
};
