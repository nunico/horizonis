const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action for modal dialogs: focuses the container on open, keeps Tab /
 * Shift+Tab cycling within it, and restores focus to the previously-focused
 * element (the trigger) when the dialog is removed.
 *
 * The container should have `tabindex="-1"` so it can receive initial focus
 * without being part of the Tab order.
 */
export function focusTrap(node: HTMLElement) {
	const previouslyFocused = document.activeElement as HTMLElement | null;

	const focusable = () =>
		Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => !el.hasAttribute('disabled')
		);

	// Move focus into the dialog (prefer the container itself if focusable).
	if (node.hasAttribute('tabindex')) {
		node.focus();
	} else {
		focusable()[0]?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		const items = focusable();
		if (items.length === 0) {
			e.preventDefault();
			node.focus();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;

		if (e.shiftKey && (active === first || active === node)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			previouslyFocused?.focus?.();
		}
	};
}
