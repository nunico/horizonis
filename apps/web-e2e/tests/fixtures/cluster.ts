// Lightweight cluster-data fixture for Playwright E2E tests
// This mirrors the shape expected by the app `cluster` store (StarCluster-like)

export type ClusterLike = {
  Name: string;
  Systems: Array<{
    Id: string;
    Name: string;
    X: number;
    Y: number;
    Stars: Array<{
      Id: string;
      Name: string;
      SpectralClass: string;
      RadiusSol: number;
      MassSol: number;
      OrbitAu: number;
      Satellites: unknown[];
      OrbitalRegions: unknown[];
    }>;
    OrbitalBodies: Array<{
      Id: string;
      Name: string;
      BodyType: string;
      OrbitAu: number;
      RadiusKm: number;
      MassEarth: number;
      Satellites: unknown[];
      Tags?: string[];
    }>;
    OrbitalRegions: Array<{
      Name: string;
      InnerRadiusAu: number;
      OuterRadiusAu: number;
      RegionType: string;
    }>;
    Portals: Array<{
      Id: string;
      Name: string;
      TargetSystemId: string;
    }>;
  }>;
};

export function getFixtureCluster(): ClusterLike {
  const star = {
    Id: 'star-alpha',
    Name: 'Alpha',
    SpectralClass: 'G2V',
    RadiusSol: 1,
    MassSol: 1,
    OrbitAu: 0,
    Satellites: [],
    OrbitalRegions: []
  };

  const planet = {
    Id: 'planet-1',
    Name: 'Horizon',
    BodyType: 'Planet',
    OrbitAu: 1,
    RadiusKm: 6371,
    MassEarth: 1,
    Satellites: [],
    Tags: ['habitable']
  };

  const regions = [
    { Name: 'Inner System', InnerRadiusAu: 0.2, OuterRadiusAu: 2.0, RegionType: 'Inner' }
  ];

  const system = {
    Id: 'sys-0001',
    Name: 'Fixture System',
    X: 0,
    Y: 0,
    Stars: [star],
    OrbitalBodies: [planet],
    OrbitalRegions: regions,
    Portals: [] as Array<{ Id: string; Name: string; TargetSystemId: string }>
  };

  const neighbor = {
    Id: 'sys-0002',
    Name: 'Neighbor System',
    X: 300,
    Y: 180,
    Stars: [{ ...star, Id: 'star-beta', Name: 'Beta', SpectralClass: 'K5V' }],
    OrbitalBodies: [],
    OrbitalRegions: [],
    Portals: [] as Array<{ Id: string; Name: string; TargetSystemId: string }>
  };

  const portals = [{ Id: 'p-1', Name: 'Alpha-Beta', TargetSystemId: neighbor.Id }];
  const portals2 = [{ Id: 'p-2', Name: 'Beta-Alpha', TargetSystemId: system.Id }];

  const s1 = { ...system, Portals: portals };
  const s2 = { ...neighbor, Portals: portals2 };

  return {
    Name: 'Fixture Cluster',
    Systems: [s1, s2]
  };
}
