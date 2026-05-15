import { describe, it, expect } from 'vitest';
import { auToPixels, type ScaleConfig } from './scaling';

describe('auToPixels', () => {
	it('calculates linear scale correctly', () => {
		const config: ScaleConfig = { auToPixels: 100, mode: 'linear' };
		expect(auToPixels(0, config)).toBe(0);
		expect(auToPixels(1, config)).toBe(100);
		expect(auToPixels(5.5, config)).toBe(550);
	});

	it('calculates log scale correctly', () => {
		const config: ScaleConfig = { auToPixels: 100, mode: 'log' };
		expect(auToPixels(0, config)).toBe(0); // log10(1) * 100 * 5 = 0
		expect(auToPixels(9, config)).toBeCloseTo(500); // log10(10) * 100 * 5 = 500
	});
});
