export interface StarCluster {
	Name: string;
	Systems: SolarSystem[];
}

export interface SolarSystem {
	Id: string;
	Name: string;
	X: number;
	Y: number;
	Stars: Star[];
	OrbitalBodies: OrbitalBody[];
	OrbitalRegions: OrbitalRegion[];
	Portals: Portal[];
}

export interface Star {
	Id: string;
	Name: string;
	SpectralClass: string;
	RadiusSol: number;
	MassSol: number;
	OrbitAu: number;
	CompanionDistanceAu: number;
	CompanionAngleRad: number;
	Satellites: OrbitalBody[];
	OrbitalRegions: OrbitalRegion[];
}

export interface OrbitalBody {
	Id: string;
	Name: string;
	BodyType: BodyType;
	OrbitAu: number;
	RadiusKm: number;
	MassEarth: number;
	Satellites: OrbitalBody[];
	Tags: string[];
}

export type BodyType = 'Planet' | 'Moon' | 'SpaceStation' | 'DwarfPlanet' | 'Comet';

export interface OrbitalRegion {
	Name: string;
	InnerRadiusAu: number;
	OuterRadiusAu: number;
	RegionType: string;
}

export interface Portal {
	Id: string;
	Name: string;
	TargetSystemId: string;
}
