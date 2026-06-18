import { describe, it, expect } from 'vitest';
import { realisticStyle } from './realistic';

describe('realisticStyle', () => {
	it('uses subtle resting orbit rings (alpha 0.1)', () => {
		// Arrange / Act
		const alpha = realisticStyle.stroke.orbit.alpha;

		// Assert
		expect(alpha).toBe(0.1);
	});

	it('renders asteroid belts as a scattered field', () => {
		// Arrange / Act
		const regionStyle = realisticStyle.regionStyle;

		// Assert
		expect(regionStyle?.kind).toBe('scatter');
	});
});
