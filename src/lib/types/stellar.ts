export interface StarCluster {
	name: string;
	systems: SolarSystem[];
}

export interface SolarSystem {
	id: string;
	name: string;
	x: number;
	y: number;
	stars: Star[];
	orbital_bodies: OrbitalBody[];
	orbital_regions: OrbitalRegion[];
	portals: Portal[];
}

export interface Star {
	id: string;
	name: string;
	spectral_class: string;
	radius_sol: number;
	mass_sol: number;
}

export interface OrbitalBody {
	id: string;
	name: string;
	body_type: BodyType;
	orbit_au: number;
	radius_km: number;
	mass_earth: number;
	satellites: OrbitalBody[];
	tags: string[];
}

export type BodyType = 'Planet' | 'Moon' | 'SpaceStation' | 'DwarfPlanet' | 'Comet';

export interface OrbitalRegion {
	name: string;
	inner_radius_au: number;
	outer_radius_au: number;
	region_type: string;
}

export interface Portal {
	id: string;
	name: string;
	target_system_id: string;
}
