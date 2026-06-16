import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { focusTrap } from './focusTrap';

function buildDialog() {
	const dialog = document.createElement('div');
	dialog.setAttribute('tabindex', '-1');
	const first = document.createElement('button');
	first.textContent = 'first';
	const last = document.createElement('button');
	last.textContent = 'last';
	dialog.append(first, last);
	document.body.appendChild(dialog);
	return { dialog, first, last };
}

function tab(target: Element, shiftKey = false) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true }));
}

describe('focusTrap action', () => {
	let trigger: HTMLButtonElement;

	beforeEach(() => {
		trigger = document.createElement('button');
		trigger.textContent = 'trigger';
		document.body.appendChild(trigger);
		trigger.focus();
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('focuses the dialog container on mount', () => {
		const { dialog } = buildDialog();
		focusTrap(dialog);
		expect(document.activeElement).toBe(dialog);
	});

	it('wraps Tab from the last element back to the first', () => {
		const { dialog, first, last } = buildDialog();
		focusTrap(dialog);

		last.focus();
		tab(dialog);
		expect(document.activeElement).toBe(first);
	});

	it('wraps Shift+Tab from the first element to the last', () => {
		const { dialog, first, last } = buildDialog();
		focusTrap(dialog);

		first.focus();
		tab(dialog, true);
		expect(document.activeElement).toBe(last);
	});

	it('restores focus to the trigger when destroyed', () => {
		const { dialog } = buildDialog();
		const trap = focusTrap(dialog);
		expect(document.activeElement).toBe(dialog);

		trap.destroy();
		expect(document.activeElement).toBe(trigger);
	});
});
