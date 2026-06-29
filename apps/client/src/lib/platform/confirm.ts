export interface ConfirmOptions {
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	kind?: 'warning' | 'info' | 'error';
}

type TauriWindow = Window & {
	__TAURI_INTERNALS__?: unknown;
};

export async function nativeConfirm(options: ConfirmOptions): Promise<boolean | null> {
	if (typeof window === 'undefined' || !(window as TauriWindow).__TAURI_INTERNALS__) {
		return null;
	}

	const { confirm } = await import('@tauri-apps/plugin-dialog');
	return confirm(options.message, {
		title: options.title,
		kind: options.kind ?? 'warning',
		okLabel: options.confirmLabel,
		cancelLabel: options.cancelLabel
	});
}
