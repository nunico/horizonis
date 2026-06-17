import { describe, it, expect } from 'vitest';
import {
	OBAFGKM_HEX,
	hexToNumber,
	parseSpectralClass,
	resolveSpectralColor,
	resolveBodyColor
} from './palette';
import type { SpectralPalette, BodyPalette } from './types';

const spectral: SpectralPalette = {
	O: '#6b9fff',
	B: '#9fc8ff',
	A: '#e8e8e8',
	F: '#fff8d6',
	G: '#ffd966',
	K: '#ff9966',
	M: '#ff6644',
	default: '#888888'
};

const body: BodyPalette = {
	Planet: '#60a5fa',
	Moon: '#94a3b8',
	SpaceStation: '#ec4899',
	DwarfPlanet: '#a78bfa',
	Comet: '#2dd4bf',
	default: '#ffffff'
};

describe('hexToNumber', () => {
	it('parses a #RRGGBB string into a 24-bit number', () => {
		expect(hexToNumber('#ff6644')).toBe(0xff6644);
	});

	it('is case-insensitive and tolerates a missing hash', () => {
		expect(hexToNumber('FF6644')).toBe(0xff6644);
		expect(hexToNumber('#FfFfFf')).toBe(0xffffff);
	});

	it('throws on a malformed hex string', () => {
		expect(() => hexToNumber('#xyz')).toThrow();
		expect(() => hexToNumber('#fff')).toThrow();
	});
});

describe('OBAFGKM_HEX', () => {
	it('matches the documented stellar classification table', () => {
		expect(OBAFGKM_HEX).toEqual({
			O: '#6b9fff',
			B: '#9fc8ff',
			A: '#e8e8e8',
			F: '#fff8d6',
			G: '#ffd966',
			K: '#ff9966',
			M: '#ff6644'
		});
	});
});

describe('parseSpectralClass', () => {
	it('reads the leading letter of a spectral string', () => {
		expect(parseSpectralClass('G2V')).toBe('G');
		expect(parseSpectralClass('M5.5Ve')).toBe('M');
		expect(parseSpectralClass('o9')).toBe('O');
	});

	it('returns null for an unknown or empty classification', () => {
		expect(parseSpectralClass('')).toBeNull();
		expect(parseSpectralClass('DA')).toBeNull();
		expect(parseSpectralClass('123')).toBeNull();
	});
});

describe('resolveSpectralColor', () => {
	it('returns the palette color for every OBAFGKM class', () => {
		expect(resolveSpectralColor(spectral, 'O9V')).toBe(0x6b9fff);
		expect(resolveSpectralColor(spectral, 'B0')).toBe(0x9fc8ff);
		expect(resolveSpectralColor(spectral, 'A1V')).toBe(0xe8e8e8);
		expect(resolveSpectralColor(spectral, 'F8')).toBe(0xfff8d6);
		expect(resolveSpectralColor(spectral, 'G2V')).toBe(0xffd966);
		expect(resolveSpectralColor(spectral, 'K5')).toBe(0xff9966);
		expect(resolveSpectralColor(spectral, 'M3V')).toBe(0xff6644);
	});

	it('falls back to the default for unknown classes and empty input', () => {
		expect(resolveSpectralColor(spectral, 'DA')).toBe(0x888888);
		expect(resolveSpectralColor(spectral, '')).toBe(0x888888);
	});
});

describe('resolveBodyColor', () => {
	it('returns the mapped color for each known body type', () => {
		expect(resolveBodyColor(body, 'Planet')).toBe(0x60a5fa);
		expect(resolveBodyColor(body, 'Comet')).toBe(0x2dd4bf);
	});

	it('falls back to the default for an unknown body type', () => {
		expect(resolveBodyColor(body, 'Wormhole')).toBe(0xffffff);
	});
});
