export type ScaleMode = 'linear' | 'log';

export interface ScaleConfig {
	auToPixels: number;
	mode: ScaleMode;
}

export function auToPixels(au: number, config: ScaleConfig): number {
	if (config.mode === 'linear') {
		return au * config.auToPixels;
	} else {
		// Log scale: useful for viewing distant planets
		// We use log10(au * 100 + 1) to give better spread for small au (satellites)
		// and squash large distances.
		return (Math.log10(au * 100 + 1) * config.auToPixels) / 2;
	}
}

export function getVisualRadius(radius_km: number): number {
	// Logarithmic scaling ensures small moons are visible and large stars
	// don't dominate the screen too much.
	// radius_km can be very small for stations, but usually > 0.
	return 5 + Math.log10(Math.max(radius_km, 1)) * 4;
}
