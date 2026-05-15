const SYSTEM_NAMES = [
  "Alpha Centauri", "Sirius", "Epsilon Eridani", "Procyon", "61 Cygni",
  "Tau Ceti", "Vega", "Altair", "Fomalhaut", "Arcturus",
  "Pollux", "Capella", "Regulus", "Castor", "Spica"
];

const SPECTRAL_CLASSES = ["O5V", "B1V", "A0V", "F5V", "G2V", "K0V", "M5V"];
const BODY_TYPES = ["Planet", "Moon", "SpaceStation", "DwarfPlanet", "Comet"];

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomRange(min, max + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBody(depth = 0): any {
  const bodyType = pickRandom(BODY_TYPES);
  const body = {
    id: crypto.randomUUID(),
    name: `${pickRandom(["New", "Old", "Great", "Minor", "Inner", "Outer"])} ${pickRandom(["Terra", "Vesta", "Ceres", "Juno", "Pallas"])}`,
    body_type: bodyType,
    orbit_au: randomRange(0.1, 50),
    satellites: [],
    tags: [pickRandom(["Mineral Rich", "Atmospheric", "Barren", "Volcanic", "Frozen"])]
  };

  if (depth < 1 && Math.random() > 0.4) {
    const numMoons = randomInt(1, 4);
    for (let i = 0; i < numMoons; i++) {
      const moon = {
        id: crypto.randomUUID(),
        name: `${body.name} ${String.fromCharCode(97 + i)}`,
        body_type: "Moon",
        orbit_au: randomRange(0.005, 0.02),
        satellites: [],
        tags: []
      };
      body.satellites.push(moon);
    }
  }

  return body;
}

const systems = SYSTEM_NAMES.map((name, index) => {
  const isMultiStar = index < 5; // First 5 are binary/trinary
  const numStars = isMultiStar ? randomInt(2, 3) : 1;
  
  const stars = Array.from({ length: numStars }, (_, i) => ({
    id: crypto.randomUUID(),
    name: numStars > 1 ? `${name} ${String.fromCharCode(65 + i)}` : name,
    spectral_class: pickRandom(SPECTRAL_CLASSES),
    radius_sol: randomRange(0.5, 3)
  }));

  const numBodies = randomInt(4, 12);
  const orbital_bodies = Array.from({ length: numBodies }, () => generateBody());
  orbital_bodies.sort((a, b) => a.orbit_au - b.orbit_au);

  const numRegions = randomInt(0, 3);
  const orbital_regions = Array.from({ length: numRegions }, () => {
    const inner = randomRange(2, 60);
    return {
      name: pickRandom(["Asteroid Belt", "Kuiper Belt", "Dust Cloud", "Scattered Disk"]),
      inner_radius_au: inner,
      outer_radius_au: inner + randomRange(1, 5),
      region_type: "Asteroid Belt"
    };
  });

  return {
    id: crypto.randomUUID(),
    name: name,
    x: randomRange(-1500, 1500),
    y: randomRange(-1500, 1500),
    stars,
    orbital_bodies,
    orbital_regions,
    portals: []
  };
});

// Create some random portals (making sure it's somewhat connected)
systems.forEach((system, i) => {
  // Connect to next system and one random other
  const neighbors = [(i + 1) % systems.length, randomInt(0, systems.length - 1)];
  
  neighbors.forEach(nIdx => {
    const target = systems[nIdx];
    if (target.id !== system.id && !system.portals.find(p => p.target_system_id === target.id)) {
      system.portals.push({
        id: crypto.randomUUID(),
        name: `Jump to ${target.name}`,
        target_system_id: target.id
      });
    }
  });
});

const cluster = {
  name: "Horizonis Sector",
  systems
};

console.log(JSON.stringify(cluster, null, 2));
