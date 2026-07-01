import type { BodyType } from '$lib/types/stellar';

/**
 * Centralized design tokens for the Horizonis canvas and UI.
 *
 * Colors are PixiJS-style 24-bit RGB numbers (0xRRGGBB) so they can be passed
 * directly to Graphics fills/strokes. Magic numbers previously scattered across
 * StarMap/SolarSystemMap/Navigation/Inspector live here so the experience stays
 * visually and behaviorally consistent and is tunable from one place.
 */

export const MAP_COLORS = {
	// Star spectral-class fills — OBAFGKM sequence from
	// docs/stellar_classifications.md (blue → white → yellow → orange → red).
	spectralO: 0x6b9fff,
	spectralB: 0x9fc8ff,
	spectralA: 0xe8e8e8,
	spectralF: 0xfff8d6,
	spectralG: 0xffd966,
	spectralK: 0xff9966,
	spectralM: 0xff6644,
	spectralDefault: 0x38bdf8,

	// Orbital-body fills (keyed by BodyType)
	bodyPlanet: 0x60a5fa,
	bodyMoon: 0x94a3b8,
	bodySpaceStation: 0xec4899,
	bodyDwarfPlanet: 0xa78bfa,
	bodyComet: 0x2dd4bf,
	bodyDefault: 0xffffff,

	// Node / link strokes & fills
	systemFill: 0x38bdf8,
	accent: 0x38bdf8, // selection + highlighted links
	hover: 0xffffff, // hover outline
	linkIdle: 0x334155, // portals / orbits at rest
	orbitHover: 0xf1f5f9,
	region: 0x475569,

	// Text
	labelPrimary: 0xf1f5f9,
	labelSecondary: 0x94a3b8,

	// Canvas background
	background: 0x020617
} as const;

const BODY_TYPE_COLORS: Record<BodyType, number> = {
	Planet: MAP_COLORS.bodyPlanet,
	Moon: MAP_COLORS.bodyMoon,
	SpaceStation: MAP_COLORS.bodySpaceStation,
	DwarfPlanet: MAP_COLORS.bodyDwarfPlanet,
	Comet: MAP_COLORS.bodyComet
};

const SPECTRAL_COLORS: Record<string, number> = {
	O: MAP_COLORS.spectralO,
	B: MAP_COLORS.spectralB,
	A: MAP_COLORS.spectralA,
	F: MAP_COLORS.spectralF,
	G: MAP_COLORS.spectralG,
	K: MAP_COLORS.spectralK,
	M: MAP_COLORS.spectralM
};

/** Resolve a star's fill color from its OBAFGKM spectral classification. */
export function getSpectralColor(spectralClass: string): number {
	const letter = spectralClass.charAt(0).toUpperCase();
	return SPECTRAL_COLORS[letter] ?? MAP_COLORS.spectralDefault;
}

/** Resolve an orbital body's fill color from its type, with a safe fallback. */
export function getBodyTypeColor(bodyType: string): number {
	return BODY_TYPE_COLORS[bodyType as BodyType] ?? MAP_COLORS.bodyDefault;
}

export const LAYOUT = {
	/** Height of the fixed top navigation bar (Tailwind `h-14`). */
	navbarHeightPx: 56,
	/** Fixed cluster-list overlay width plus its left offset (`w-60 left-4`). */
	clusterSidebarWidthPx: 256,
	/** Fixed system-object overlay width plus its left offset (`w-72 left-4`). */
	systemSidebarWidthPx: 304,
	/** Spatial-grid cell size used for nearest-system lookups. */
	spatialGridSize: 200
} as const;

export const INTERACTION = {
	/** Max gap between taps to count as a double-click (open system). */
	doubleClickMs: 350,
	/** Search input debounce. */
	searchDebounceMs: 200,
	/** Max results shown in the search dropdown. */
	searchResultsLimit: 10,
	/** Pointer travel before a press becomes a drag (Phase 2 drag threshold). */
	dragThresholdPx: 4
} as const;
