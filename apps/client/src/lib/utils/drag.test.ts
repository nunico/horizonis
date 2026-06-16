import { describe, it, expect } from 'vitest';
import { exceedsDragThreshold } from './drag';

describe('exceedsDragThreshold', () => {
	const start = { x: 100, y: 100 };

	it('is false when the pointer has not moved', () => {
		expect(exceedsDragThreshold(start, { x: 100, y: 100 }, 4)).toBe(false);
	});

	it('is false for movement within the threshold', () => {
		expect(exceedsDragThreshold(start, { x: 102, y: 102 }, 4)).toBe(false);
	});

	it('is true once movement exceeds the threshold', () => {
		expect(exceedsDragThreshold(start, { x: 110, y: 100 }, 4)).toBe(true);
	});

	it('uses Euclidean distance (diagonal counts)', () => {
		// dx=3, dy=4 -> distance 5
		expect(exceedsDragThreshold(start, { x: 103, y: 104 }, 4)).toBe(true);
	});

	it('treats exactly the threshold as not yet a drag', () => {
		expect(exceedsDragThreshold(start, { x: 105, y: 100 }, 5)).toBe(false);
	});
});
