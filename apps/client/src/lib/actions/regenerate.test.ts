import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { performRegenerate, requestRegenerate } from './regenerate';
import { cluster } from '$lib/stores/clusterData';
import { canUndo, clearHistory } from '$lib/stores/history';
import { toasts, clearToasts } from '$lib/stores/toast';
import type { StarCluster } from '$lib/types/stellar';

const { mockGenerateNewCluster, mockNativeConfirm } = vi.hoisted(() => ({
	mockGenerateNewCluster: vi.fn(),
	mockNativeConfirm: vi.fn()
}));

vi.mock('$lib/stores/clusterData', async (importOriginal) => {
	const original = (await importOriginal()) as typeof import('$lib/stores/clusterData');
	return {
		...original,
		generateNewCluster: mockGenerateNewCluster
	};
});

vi.mock('$lib/platform/confirm', () => ({
	nativeConfirm: mockNativeConfirm
}));

const previousCluster: StarCluster = { Name: 'Previous', Systems: [] };
const nextCluster: StarCluster = { Name: 'Next', Systems: [] };

describe('regenerate actions', () => {
	beforeEach(() => {
		cluster.set(previousCluster);
		vi.clearAllMocks();
		clearToasts();
		clearHistory();
		mockGenerateNewCluster.mockResolvedValue(nextCluster);
		mockNativeConfirm.mockResolvedValue(null);
	});

	it('generates a new cluster, records the previous snapshot, and toasts success', async () => {
		const onDone = vi.fn();

		await performRegenerate(onDone);

		expect(mockGenerateNewCluster).toHaveBeenCalledWith();
		expect(get(canUndo)).toBe(true);
		expect(onDone).toHaveBeenCalledOnce();
		expect(get(toasts)).toHaveLength(1);
		expect(get(toasts)[0]).toMatchObject({ type: 'success' });
	});

	it('does not record a snapshot or call onDone when generation fails', async () => {
		mockGenerateNewCluster.mockRejectedValue(new Error('boom'));
		const onDone = vi.fn();

		await performRegenerate(onDone);

		expect(get(canUndo)).toBe(false);
		expect(onDone).not.toHaveBeenCalled();
	});

	it('requests native confirm and regenerates immediately when accepted', async () => {
		mockNativeConfirm.mockResolvedValue(true);
		const onDone = vi.fn();
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onDone, onShowConfirm });

		expect(mockGenerateNewCluster).toHaveBeenCalledWith();
		expect(onShowConfirm).not.toHaveBeenCalled();
	});

	it('falls back to the in-app confirm dialog when native confirm is unavailable', async () => {
		mockNativeConfirm.mockResolvedValue(null);
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onShowConfirm });

		expect(mockGenerateNewCluster).not.toHaveBeenCalled();
		expect(onShowConfirm).toHaveBeenCalledOnce();
	});

	it('does nothing when native confirm is declined', async () => {
		mockNativeConfirm.mockResolvedValue(false);
		const onShowConfirm = vi.fn();

		await requestRegenerate({ onShowConfirm });

		expect(mockGenerateNewCluster).not.toHaveBeenCalled();
		expect(onShowConfirm).not.toHaveBeenCalled();
	});
});
