import type { SpectralClass, SpectralPalette, BodyPalette } from './types';

/**
 * Canonical OBAFGKM colors from `docs/stellar_classifications.md`
 * (blue → blue-white → white → yellow-white → yellow → orange → red).
 */
export const OBAFGKM_HEX: Record<SpectralClass, string> = {
	O: '#6b9fff',
	B: '#9fc8ff',
	A: '#e8e8e8',
	F: '#fff8d6',
	G: '#ffd966',
	K: '#ff9966',
	M: '#ff6644'
} as const;

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

/** Convert a `#RRGGBB` (hash optional) string to a PixiJS 0xRRGGBB number. */
export function hexToNumber(hex: string): number {
	const match = HEX_RE.exec(hex.trim());
	if (!match) {
		throw new Error(`Invalid hex color: ${JSON.stringify(hex)}`);
	}
	return parseInt(match[1], 16);
}

const VALID_CLASSES = new Set<string>(Object.keys(OBAFGKM_HEX));

/** Extract the OBAFGKM class from a spectral string, or null if unrecognized. */
export function parseSpectralClass(spectralClass: string): SpectralClass | null {
	const letter = spectralClass.trim().charAt(0).toUpperCase();
	return VALID_CLASSES.has(letter) ? (letter as SpectralClass) : null;
}

/** Resolve a star's fill from a palette by its spectral classification. */
export function resolveSpectralColor(palette: SpectralPalette, spectralClass: string): number {
	const cls = parseSpectralClass(spectralClass);
	return hexToNumber(cls ? palette[cls] : palette.default);
}

/** Resolve an orbital body's fill from a palette by its type, with fallback. */
export function resolveBodyColor(palette: BodyPalette, bodyType: string): number {
	const hex = (palette as Record<string, string>)[bodyType] ?? palette.default;
	return hexToNumber(hex);
}
