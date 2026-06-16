import { describe, it, expect } from 'vitest';
import {
	auToPixels,
	pixelsToAu,
	getVisualRadius,
	getClampedScale,
	type ScaleConfig
} from './scaling';

describe('pixelsToAu', () => {
	it('round-trips with auToPixels in linear mode', () => {
		const config: ScaleConfig = { auToPixels: 200, mode: 'linear' };
		for (const au of [0.1, 1, 5, 30, 100]) {
			expect(pixelsToAu(auToPixels(au, config), config)).toBeCloseTo(au, 6);
		}
	});

	it('round-trips with auToPixels in log mode', () => {
		const config: ScaleConfig = { auToPixels: 200, mode: 'log' };
		for (const au of [0.1, 1, 5, 30, 100]) {
			expect(pixelsToAu(auToPixels(au, config), config)).toBeCloseTo(au, 6);
		}
	});

	it('returns 0 for a non-positive scale factor', () => {
		expect(pixelsToAu(500, { auToPixels: 0, mode: 'linear' })).toBe(0);
	});
});

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
		expect(getVisualRadius(1)).toBe(4);
		expect(getVisualRadius(10)).toBe(10);
		expect(getVisualRadius(10000)).toBe(28);
	});

	it('handles very small radii', () => {
		expect(getVisualRadius(0.1)).toBe(4);
	});
});

describe('getClampedScale', () => {
	it('returns target scale when no clamping is needed', () => {
		// baseRadius = 10, target screen scale = 1.0 (viewport scale = 1.0)
		// minVisibleSatOrbit = 100
		const scale = getClampedScale(10, 100, 1.0);
		expect(scale).toBe(1.0);
	});

	it('clamps scale based on satellite orbits', () => {
		// minVisibleSatOrbit = 20. 45% of 20 = 9.
		// baseRadius = 10. Max scale = 9 / 10 = 0.9.
		const scale = getClampedScale(10, 20, 1.0);
		expect(scale).toBeCloseTo(0.9);
	});

	it('clamps scale based on parent orbit', () => {
		// orbitRadiusWorld = 20. 45% of 20 = 9.
		// baseRadius = 10. Max scale = 9 / 10 = 0.9.
		const scale = getClampedScale(10, 100, 1.0, 20);
		expect(scale).toBeCloseTo(0.9);
	});

	it('enforces parent visual radius constraint (Satellite Size Bug)', () => {
		// Parent visual radius = 10.
		// Max satellite visual radius = 10 * 0.4 = 4.
		// Satellite baseRadius = 10.
		// Target scale = 1.0.
		// Resulting visual radius would be 10, which is > 4.
		// So target scale should be clamped to 4 / 10 = 0.4.
		const scale = getClampedScale(10, 100, 1.0, undefined, 10);
		expect(scale).toBeCloseTo(0.4);
		expect(10 * scale).toBeLessThanOrEqual(10 * 0.4);
	});

	it('does not clamp if satellite is already smaller than parent', () => {
		// Parent visual radius = 10. Max satellite visual radius = 4.
		// Satellite baseRadius = 3. Target scale = 1.0.
		// Visual radius = 3, which is < 4.
		const scale = getClampedScale(3, 100, 1.0, undefined, 10);
		expect(scale).toBe(1.0);
	});

	it('applies the most restrictive clamp', () => {
		// baseRadius = 10
		// viewportScale = 1.0 -> targetScale = 1.0
		// minVisibleSatOrbit = 20 -> maxScaleSat = (20 * 0.45) / 10 = 0.9
		// orbitRadiusWorld = 15 -> maxScaleParent = (15 * 0.45) / 10 = 0.675
		// parentVisualRadius = 10 -> maxScaleHierarchy = (10 * 0.4) / 10 = 0.4
		const scale = getClampedScale(10, 20, 1.0, 15, 10);
		expect(scale).toBeCloseTo(0.4);
	});
});
