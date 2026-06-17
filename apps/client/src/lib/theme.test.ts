import { describe, it, expect } from 'vitest';
import { getSpectralColor, getBodyTypeColor, MAP_COLORS, LAYOUT, INTERACTION } from './theme';

describe('getSpectralColor', () => {
	it('returns the documented color for every OBAFGKM class', () => {
		expect(getSpectralColor('O9V')).toBe(MAP_COLORS.spectralO);
		expect(getSpectralColor('B0')).toBe(MAP_COLORS.spectralB);
		expect(getSpectralColor('A0V')).toBe(MAP_COLORS.spectralA);
		expect(getSpectralColor('F8')).toBe(MAP_COLORS.spectralF);
		expect(getSpectralColor('G2V')).toBe(MAP_COLORS.spectralG);
		expect(getSpectralColor('K5')).toBe(MAP_COLORS.spectralK);
		expect(getSpectralColor('M5V')).toBe(MAP_COLORS.spectralM);
	});

	it('returns the default star color for an unknown classification', () => {
		expect(getSpectralColor('DA')).toBe(MAP_COLORS.spectralDefault);
	});

	it('returns the default star color for an empty string', () => {
		expect(getSpectralColor('')).toBe(MAP_COLORS.spectralDefault);
	});
});

describe('getBodyTypeColor', () => {
	it('returns the mapped color for each known body type', () => {
		expect(getBodyTypeColor('Planet')).toBe(MAP_COLORS.bodyPlanet);
		expect(getBodyTypeColor('Moon')).toBe(MAP_COLORS.bodyMoon);
		expect(getBodyTypeColor('SpaceStation')).toBe(MAP_COLORS.bodySpaceStation);
		expect(getBodyTypeColor('DwarfPlanet')).toBe(MAP_COLORS.bodyDwarfPlanet);
		expect(getBodyTypeColor('Comet')).toBe(MAP_COLORS.bodyComet);
	});

	it('returns the fallback color for an unknown body type', () => {
		expect(getBodyTypeColor('Wormhole')).toBe(MAP_COLORS.bodyDefault);
	});
});

describe('design token tables', () => {
	it('exposes the navbar height used by both CSS and viewport math', () => {
		expect(LAYOUT.navbarHeightPx).toBe(56);
	});

	it('exposes interaction timing and threshold constants', () => {
		expect(INTERACTION.doubleClickMs).toBeGreaterThan(0);
		expect(INTERACTION.searchDebounceMs).toBeGreaterThan(0);
		expect(INTERACTION.searchResultsLimit).toBeGreaterThan(0);
		expect(INTERACTION.dragThresholdPx).toBeGreaterThan(0);
	});
});
