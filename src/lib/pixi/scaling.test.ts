import { describe, it, expect } from 'vitest';
import { auToPixels, getVisualRadius, type ScaleConfig } from './scaling';

describe('auToPixels', () => {
	it('calculates linear scale correctly', () => {
		const config: ScaleConfig = { auToPixels: 100, mode: 'linear' };
		expect(auToPixels(0, config)).toBe(0);
		expect(auToPixels(1, config)).toBe(100);
		expect(auToPixels(5.5, config)).toBe(550);
	});

	it('calculates log scale correctly', () => {
		const config: ScaleConfig = { auToPixels: 100, mode: 'log' };
		expect(auToPixels(0, config)).toBe(0);
		// log10(0.09 * 100 + 1) * 100 / 2 = log10(10) * 50 = 50
		expect(auToPixels(0.09, config)).toBeCloseTo(50);
		// log10(0.99 * 100 + 1) * 100 / 2 = log10(100) * 50 = 100
		expect(auToPixels(0.99, config)).toBeCloseTo(100);
	});
});

describe('getVisualRadius', () => {
	it('calculates radius correctly using log scale', () => {
		expect(getVisualRadius(1)).toBe(5);
		expect(getVisualRadius(10)).toBe(9);
		expect(getVisualRadius(10000)).toBe(21);
	});

	it('handles very small radii', () => {
		expect(getVisualRadius(0.1)).toBe(5);
	});
});
