import { describe, it, expect } from 'vitest';
import { resolveShortcut, type ShortcutContext } from './shortcuts';

const base: ShortcutContext = {
	key: '',
	inEditable: false,
	helpOpen: false,
	searchResultsOpen: false,
	hasSelection: false,
	viewMode: 'cluster'
};

describe('resolveShortcut', () => {
	it('toggles help on "?" when not typing', () => {
		expect(resolveShortcut({ ...base, key: '?' })).toBe('toggle-help');
	});

	it('ignores "?" while typing in an editable field', () => {
		expect(resolveShortcut({ ...base, key: '?', inEditable: true })).toBe('none');
	});

	it('focuses search on "/" when not typing', () => {
		expect(resolveShortcut({ ...base, key: '/' })).toBe('focus-search');
	});

	it('ignores "/" while typing in an editable field', () => {
		expect(resolveShortcut({ ...base, key: '/', inEditable: true })).toBe('none');
	});

	it('goes back to cluster on Backspace from the system view when not typing', () => {
		expect(resolveShortcut({ ...base, key: 'Backspace', viewMode: 'system' })).toBe(
			'back-to-cluster'
		);
	});

	it('ignores Backspace while typing', () => {
		expect(
			resolveShortcut({ ...base, key: 'Backspace', viewMode: 'system', inEditable: true })
		).toBe('none');
	});

	it('ignores Backspace in the cluster view', () => {
		expect(resolveShortcut({ ...base, key: 'Backspace', viewMode: 'cluster' })).toBe('none');
	});

	describe('Escape precedence (topmost layer wins, even while typing)', () => {
		it('closes help first', () => {
			expect(
				resolveShortcut({
					...base,
					key: 'Escape',
					helpOpen: true,
					searchResultsOpen: true,
					hasSelection: true
				})
			).toBe('close-help');
		});

		it('closes the search dropdown before clearing selection', () => {
			expect(
				resolveShortcut({
					...base,
					key: 'Escape',
					searchResultsOpen: true,
					hasSelection: true
				})
			).toBe('close-search');
		});

		it('clears selection when nothing else is open', () => {
			expect(resolveShortcut({ ...base, key: 'Escape', hasSelection: true })).toBe(
				'clear-selection'
			);
		});

		it('resolves Escape even from an editable field', () => {
			expect(
				resolveShortcut({ ...base, key: 'Escape', hasSelection: true, inEditable: true })
			).toBe('clear-selection');
		});

		it('does nothing when there is nothing to dismiss', () => {
			expect(resolveShortcut({ ...base, key: 'Escape' })).toBe('none');
		});
	});

	it('returns "none" for unhandled keys', () => {
		expect(resolveShortcut({ ...base, key: 'a' })).toBe('none');
	});
});
