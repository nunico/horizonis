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
		const maxVisRadius = parentVisualRadius * 0.8;
		if (baseRadius * targetScale > maxVisRadius) {
			targetScale = maxVisRadius / baseRadius;
		}
	}

	return targetScale;
}
