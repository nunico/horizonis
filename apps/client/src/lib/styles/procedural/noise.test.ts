import { describe, it, expect } from 'vitest';
import { createRng } from './noise';

describe('createRng', () => {
	it('produces the same sequence for the same seed', () => {
		const a = createRng(42);
		const b = createRng(42);
		const seqA = [a(), a(), a(), a()];
		const seqB = [b(), b(), b(), b()];
		expect(seqA).toEqual(seqB);
	});

	it('produces different sequences for different seeds', () => {
		const a = createRng(1);
		const b = createRng(2);
		expect([a(), a()]).not.toEqual([b(), b()]);
	});

	it('returns values in the half-open range [0, 1)', () => {
		const rng = createRng(99);
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});
