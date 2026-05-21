import type { SolarSystem, Star, OrbitalBody } from '$lib/types/stellar';

export function getUniquePortals(systems: SolarSystem[]) {
	const uniquePortals = new Map<string, { from: string; to: string }>();
	for (const system of systems) {
		for (const portal of system.Portals || []) {
			const id1 = system.Id;
			const id2 = portal.TargetSystemId;
			const key = [id1, id2].sort().join('-');
			if (!uniquePortals.has(key)) {
				uniquePortals.set(key, { from: id1, to: id2 });
			}
		}
	}
	return Array.from(uniquePortals.entries()).map(([key, pair]) => ({
		key,
		...pair
	}));
}

export function getEntityMaxSatRadius(
	body: Partial<Star> & Partial<OrbitalBody>,
	scaleConfig: { auToPixels: number; mode: string },
	getVisualRadius: (r: number) => number,
	auToPixels: (au: number, config: { auToPixels: number; mode: string }) => number
): number {
	let maxR: number;
	if (body.RadiusKm !== undefined) {
		maxR = getVisualRadius(body.RadiusKm);
	} else if (body.RadiusSol !== undefined) {
		maxR = getVisualRadius(body.RadiusSol * 695700);
	} else {
		maxR = 0;
	}

	if (body.Satellites) {
		for (const sat of body.Satellites) {
			const orbitR = auToPixels(sat.OrbitAu, scaleConfig);
			const satBoundary =
				orbitR + getEntityMaxSatRadius(sat, scaleConfig, getVisualRadius, auToPixels);
			if (satBoundary > maxR) maxR = satBoundary;
		}
	}
	if (body.OrbitalRegions) {
		for (const reg of body.OrbitalRegions) {
			const regR = auToPixels(reg.OuterRadiusAu, scaleConfig);
			if (regR > maxR) maxR = regR;
		}
	}
	return maxR;
}
