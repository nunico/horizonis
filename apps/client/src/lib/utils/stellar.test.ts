import { describe, expect, it } from 'vitest';
import { getStarRelativePosition } from './stellar';

describe('stellar utilities', () => {
	it('calculates star world coordinates from main-star-relative position', () => {
		// Arrange
		const distanceAu = 100;
		const angleRad = Math.PI / 2;
		const auToPixels = (au: number) => au;

		// Act
		const position = getStarRelativePosition({ distanceAu, angleRad, auToPixels });

		// Assert
		expect(position.x).toBeCloseTo(0);
		expect(position.y).toBeCloseTo(100);
	});
});
