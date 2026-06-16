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

/**
 * Inverse of {@link auToPixels}: convert a world-pixel distance back to AU for
 * the given scale config. Used to preserve the camera framing (in AU) when the
 * scale mode changes and the pixel mapping shifts underneath it.
 */
export function pixelsToAu(px: number, config: ScaleConfig): number {
	if (config.auToPixels <= 0) return 0;
	if (config.mode === 'linear') {
		return px / config.auToPixels;
	}
	// Invert px = log10(au * 100 + 1) * k / 2
	return (Math.pow(10, (2 * px) / config.auToPixels) - 1) / 100;
}

export function getVisualRadius(radiusKm: number): number {
	// Logarithmic scaling ensures small moons are visible and large stars
	// don't dominate the screen too much.
	// radiusKm can be very small for stations, but usually > 0.
	return 4 + Math.log10(Math.max(radiusKm, 1)) * 6;
}

export function getClampedScale(
	baseRadius: number,
	minVisibleSatOrbit: number,
	viewportScale: number,
	orbitRadiusWorld?: number,
	parentVisualRadius?: number
): number {
	const s = 1 / viewportScale;
	const maxScaleSat = (minVisibleSatOrbit * 0.45) / baseRadius;

	let maxScale = maxScaleSat;
	if (orbitRadiusWorld !== undefined) {
		const maxScaleParent = (orbitRadiusWorld * 0.45) / baseRadius;
		maxScale = Math.min(maxScale, maxScaleParent);
	}

	let targetScale = Math.min(s, maxScale);

	if (parentVisualRadius !== undefined) {
		// Enforce parent visual radius constraint: satellite must be smaller than parent
		const maxVisRadius = parentVisualRadius * 0.4;
		if (baseRadius * targetScale > maxVisRadius) {
			targetScale = maxVisRadius / baseRadius;
		}
	}

	return targetScale;
}
