import { describe, it, expect } from 'vitest';
import { nextIndex } from './listNav';

describe('nextIndex', () => {
	it('moves down with ArrowDown', () => {
		expect(nextIndex(0, 3, 'ArrowDown')).toBe(1);
	});

	it('moves up with ArrowUp', () => {
		expect(nextIndex(2, 3, 'ArrowUp')).toBe(1);
	});

	it('wraps from the last item to the first on ArrowDown', () => {
		expect(nextIndex(2, 3, 'ArrowDown')).toBe(0);
	});

	it('wraps from the first item to the last on ArrowUp', () => {
		expect(nextIndex(0, 3, 'ArrowUp')).toBe(2);
	});

	it('leaves the index unchanged for other keys', () => {
		expect(nextIndex(1, 3, 'Enter')).toBe(1);
	});

	it('returns 0 when the list is empty', () => {
		expect(nextIndex(0, 0, 'ArrowDown')).toBe(0);
	});
});
