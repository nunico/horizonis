import { get } from 'svelte/store';
import { cluster, generateNewCluster } from '$lib/stores/clusterData';
import { recordSnapshot } from '$lib/stores/history';
import { toast } from '$lib/stores/toast';
import { nativeConfirm } from '$lib/platform/confirm';

export interface RegenerateCallbacks {
	onDone?: () => void;
	onShowConfirm: () => void;
}

export async function performRegenerate(onDone?: () => void): Promise<void> {
	const previous = get(cluster);
	try {
		await generateNewCluster();
		if (previous) recordSnapshot(previous);
		onDone?.();
		toast.success('New cluster generated — press Ctrl/Cmd+Z to undo');
	} catch {
		// generateNewCluster already surfaces an error toast.
	}
}

export async function requestRegenerate(callbacks: RegenerateCallbacks): Promise<void> {
	const accepted = await nativeConfirm({
		title: 'Generate a new cluster?',
		message: 'This replaces your current cluster. You can undo it right after.',
		confirmLabel: 'Generate',
		cancelLabel: 'Cancel',
		kind: 'warning'
	});

	if (accepted === true) {
		await performRegenerate(callbacks.onDone);
	} else if (accepted === null) {
		callbacks.onShowConfirm();
	}
}
