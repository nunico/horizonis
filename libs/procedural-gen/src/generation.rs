use crate::models::{BodyType, OrbitalBody, OrbitalRegion, Portal, SolarSystem, Star, StarCluster};
use delaunator::{triangulate, Point};
use rand::prelude::*;
use rand::rngs::StdRng;
use std::collections::HashSet;
use uuid::Uuid;

const SYSTEM_NAMES: &[&str] = &[
    "Alpha Centauri",
    "Sirius",
    "Epsilon Eridani",
    "Procyon",
    "61 Cygni",
    "Tau Ceti",
    "Vega",
    "Altair",
    "Fomalhaut",
    "Arcturus",
    "Pollux",
    "Capella",
    "Regulus",
    "Castor",
    "Spica",
    "Rigel",
    "Betelgeuse",
    "Deneb",
    "Antares",
    "Aldebaran",
    "Canopus",
    "Achernar",
    "Hadar",
    "Acrux",
    "Bellatrix",
    "Elnath",
    "Alnilam",
    "Alnitak",
    "Alioth",
    "Kaus Australis",
    "Mirfak",
    "Dubhe",
    "Wezen",
    "Sargas",
    "Avior",
    "Menkalinan",
    "Atria",
    "Alhena",
    "Peacock",
    "Alsephina",
    "Mirzam",
    "Alphard",
    "Hamal",
    "Algieba",
    "Diphda",
    "Nunki",
    "Menkent",
    "Mirach",
    "Alpheratz",
    "Saiph",
];

const SPECTRAL_CLASSES: &[(&str, f32, f32)] = &[
    ("O5V", 60.0, 15.0),
    ("B1V", 10.0, 5.0),
    ("A0V", 2.1, 1.8),
    ("F5V", 1.4, 1.3),
    ("G2V", 1.0, 1.0),
    ("K0V", 0.8, 0.85),
    ("M5V", 0.2, 0.25),
];

pub fn generate_cluster(seed: u64) -> StarCluster {
    let mut rng = StdRng::seed_from_u64(seed);
    let system_count = rng.random_range(15..25);
    let mut systems = Vec::with_capacity(system_count);

    // Generate system positions and basic data
    let mut names = SYSTEM_NAMES.to_vec();
    names.shuffle(&mut rng);

    for i in 0..system_count {
        let name = if i < names.len() {
            names[i].to_string()
        } else {
            format!("System {}", i)
        };

        let x = rng.random_range(-1500.0..1500.0);
        let y = rng.random_range(-1500.0..1500.0);

        systems.push(generate_solar_system(&mut rng, name, x, y));
    }

    // Generate portals using Delaunay triangulation
    let points: Vec<Point> = systems
        .iter()
        .map(|s| Point {
            x: s.x as f64,
            y: s.y as f64,
        })
        .collect();
    let tri = triangulate(&points);

    // Extract unique edges
    let mut edges = HashSet::new();
    for i in 0..tri.triangles.len() / 3 {
        let t1 = tri.triangles[3 * i];
        let t2 = tri.triangles[3 * i + 1];
        let t3 = tri.triangles[3 * i + 2];

        for (u, v) in [(t1, t2), (t2, t3), (t3, t1)] {
            let (start, end) = if u < v { (u, v) } else { (v, u) };
            edges.insert((start, end));
        }
    }
    let mut edges: Vec<_> = edges.into_iter().collect();
    edges.sort_unstable();

    // Prune edges to meet degree constraints while ensuring connectivity
    let mut degrees = vec![0; system_count];
    let mut final_edges = Vec::new();
    let mut dsu = (0..system_count).collect::<Vec<_>>();
    let mut components = system_count;

    fn find(dsu: &mut [usize], i: usize) -> usize {
        if dsu[i] == i {
            i
        } else {
            dsu[i] = find(dsu, dsu[i]);
            dsu[i]
        }
    }

    fn union(dsu: &mut [usize], components: &mut usize, i: usize, j: usize) -> bool {
        let root_i = find(dsu, i);
        let root_j = find(dsu, j);
        if root_i != root_j {
            dsu[root_i] = root_j;
            *components -= 1;
            true
        } else {
            false
        }
    }

    // Shuffle edges to prune randomly
    edges.shuffle(&mut rng);

    for (u, v) in edges {
        let deg_u = degrees[u];
        let deg_v = degrees[v];

        let root_u = find(&mut dsu, u);
        let root_v = find(&mut dsu, v);
        let merges = root_u != root_v;

        // Force keep if it merges components
        // Otherwise, keep based on probability and degree limits
        let keep = if merges {
            true
        } else {
            let keep_prob = if deg_u < 2 && deg_v < 2 {
                0.6
            } else if deg_u < 3 && deg_v < 3 {
                0.2
            } else {
                0.02
            };
            rng.random_bool(keep_prob)
        };

        if keep {
            if merges {
                union(&mut dsu, &mut components, u, v);
            }
            final_edges.push((u, v));
            degrees[u] += 1;
            degrees[v] += 1;
        }
    }

    // Add portals to systems
    for (u, v) in final_edges {
        let id_u = systems[u].id;
        let id_v = systems[v].id;
        let name_v = systems[v].name.clone();
        let name_u = systems[u].name.clone();

        systems[u].portals.push(Portal {
            id: gen_uuid(&mut rng),
            name: format!("Jump to {}", name_v),
            target_system_id: id_v,
        });
        systems[v].portals.push(Portal {
            id: gen_uuid(&mut rng),
            name: format!("Jump to {}", name_u),
            target_system_id: id_u,
        });
    }

    StarCluster {
        name: format!("Cluster {}", seed),
        systems,
    }
}

fn generate_solar_system(rng: &mut impl Rng, name: String, x: f32, y: f32) -> SolarSystem {
    let id = gen_uuid(rng);

    // Determine number of stars
    let num_stars = if rng.random_bool(0.2) {
        // 20% binary/trinary
        if rng.random_bool(0.7) {
            2
        } else {
            3
        }
    } else {
        1
    };

    let mut stars = Vec::with_capacity(num_stars);

    for i in 0..num_stars {
        let star_name = if num_stars > 1 {
            format!("{} {}", name, (b'A' + i as u8) as char)
        } else {
            name.clone()
        };

        let class_info = SPECTRAL_CLASSES.choose(rng).unwrap();
        let mass = class_info.1 * rng.random_range(0.9..1.1);

        stars.push(Star {
            id: gen_uuid(rng),
            name: star_name,
            spectral_class: class_info.0.to_string(),
            mass_sol: mass,
            radius_sol: class_info.2 * rng.random_range(0.9..1.1),
            orbit_au: 0.0,               // Will be set below
            companion_distance_au: 0.0,  // Main-star-relative distance
            companion_angle_rad: 0.0,    // Main-star-relative angle
            satellites: Vec::new(),      // Will be set below
            orbital_regions: Vec::new(), // Will be set below
        });
    }

    if num_stars > 1 {
        // Simple main-star-relative setup.
        // Binary: companion separated by 40-100 AU.
        // Trinary: first companion at 30-60 AU, second at 200-500 AU.
        if num_stars == 2 {
            let d = rng.random_range(40.0..100.0);
            stars[1].orbit_au = d;
            stars[1].companion_distance_au = d;
            stars[1].companion_angle_rad = rng.random_range(0.0..std::f32::consts::TAU);
        } else {
            let d_inner = rng.random_range(30.0..60.0);
            let d_outer = rng.random_range(200.0..500.0);
            let base_angle = rng.random_range(0.0..std::f32::consts::TAU);

            stars[1].orbit_au = d_inner;
            stars[1].companion_distance_au = d_inner;
            stars[1].companion_angle_rad = base_angle;

            stars[2].orbit_au = d_outer;
            stars[2].companion_distance_au = d_outer;
            stars[2].companion_angle_rad =
                (base_angle + std::f32::consts::PI).rem_euclid(std::f32::consts::TAU);
        }
    }

    // Generate planetary systems for each star
    let star_count = stars.len();
    for i in 0..star_count {
        let mut stable_limit = 50.0;
        if star_count > 1 {
            // Find distance to closest other star
            let mut min_dist = f32::MAX;
            for j in 0..star_count {
                if i == j {
                    continue;
                }
                let dx = stars[i].companion_distance_au * stars[i].companion_angle_rad.cos()
                    - stars[j].companion_distance_au * stars[j].companion_angle_rad.cos();
                let dy = stars[i].companion_distance_au * stars[i].companion_angle_rad.sin()
                    - stars[j].companion_distance_au * stars[j].companion_angle_rad.sin();
                let dist = dx.hypot(dy);
                if dist < min_dist && dist > 0.01 {
                    min_dist = dist;
                }
            }
            stable_limit = min_dist * 0.35;
        }

        let num_bodies = rng.random_range(0..8);
        let initial_orbit = 0.3 * stars[i].mass_sol.sqrt() * rng.random_range(0.8..1.2);
        let mut current_orbit = initial_orbit;
        for j in 0..num_bodies {
            current_orbit *= rng.random_range(1.3..1.9);
            if current_orbit > stable_limit {
                break;
            }
            stars[i]
                .satellites
                .push(generate_body(rng, j, current_orbit));
        }

        // Generate star-level regions
        if rng.random_bool(0.5) {
            let last_orbit = stars[i]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(current_orbit);
            let inner = last_orbit * rng.random_range(1.2..1.8);
            let outer = inner + rng.random_range(0.5..2.0);
            if outer < stable_limit {
                let star_name = stars[i].name.clone();
                stars[i].orbital_regions.push(OrbitalRegion {
                    name: format!("{} Asteroid Belt", star_name),
                    inner_radius_au: inner,
                    outer_radius_au: outer,
                    region_type: "Asteroid Belt".to_string(),
                });
            }
        }

        // Every star gets at least one planet or asteroid field, when the
        // stable region around it is large enough to hold one.
        if stars[i].satellites.is_empty() && stars[i].orbital_regions.is_empty() {
            if initial_orbit <= stable_limit {
                stars[i]
                    .satellites
                    .push(generate_body(rng, 0, initial_orbit));
            } else {
                let inner = stable_limit * rng.random_range(0.3..0.6);
                let outer = (inner + rng.random_range(0.1..0.3) * stable_limit).min(stable_limit);
                if outer > inner {
                    let star_name = stars[i].name.clone();
                    stars[i].orbital_regions.push(OrbitalRegion {
                        name: format!("{} Asteroid Belt", star_name),
                        inner_radius_au: inner,
                        outer_radius_au: outer,
                        region_type: "Asteroid Belt".to_string(),
                    });
                }
            }
        }
    }

    // Circumbinary / System-wide bodies
    let mut orbital_bodies = Vec::new();
    if num_stars > 1 {
        let mut current_orbit = stars.iter().map(|s| s.orbit_au.abs()).fold(0.0, f32::max) * 2.5;
        let num_circumbinary = rng.random_range(0..4);
        for i in 0..num_circumbinary {
            current_orbit *= rng.random_range(1.3..1.8);
            orbital_bodies.push(generate_body(rng, i, current_orbit));
        }
    } else {
        if rng.random_bool(0.3) {
            let last_planet_orbit = stars[0]
                .satellites
                .last()
                .map(|b| b.orbit_au)
                .unwrap_or(1.0);
            let orbit = last_planet_orbit * rng.random_range(5.0..20.0);
            orbital_bodies.push(generate_body(rng, 10, orbit));
        }
    }

    // Generate orbital regions (asteroid belts)
    let mut orbital_regions = Vec::new();
    if rng.random_bool(0.6) {
        let base_orbit = if !orbital_bodies.is_empty() {
            orbital_bodies[0].orbit_au * 0.7
        } else if !stars[0].satellites.is_empty() {
            stars[0].satellites.last().unwrap().orbit_au * 1.5
        } else {
            5.0
        };

        let inner = base_orbit * rng.random_range(0.8..1.2);
        orbital_regions.push(OrbitalRegion {
            name: "Asteroid Belt".to_string(),
            inner_radius_au: inner,
            outer_radius_au: inner + rng.random_range(0.5..2.0),
            region_type: "Asteroid Belt".to_string(),
        });
    }

    SolarSystem {
        id,
        name,
        x,
        y,
        stars,
        orbital_bodies,
        orbital_regions,
        portals: Vec::new(),
    }
}

fn generate_body(rng: &mut impl Rng, index: usize, orbit_au: f32) -> OrbitalBody {
    let is_gas_giant = orbit_au > 4.0;

    let (body_type, radius_km, mass_earth, tags) = if is_gas_giant {
        let mass: f32 = rng.random_range(15.0..318.0);
        let density: f32 = rng.random_range(0.7..1.7);
        let radius_earth_equiv = (mass / (density / 5.51)).powf(1.0 / 3.0);
        let radius_km = radius_earth_equiv * 6371.0;

        (
            BodyType::Planet,
            radius_km,
            mass,
            vec!["Gas Giant".to_string()],
        )
    } else {
        let mass: f32 = rng.random_range(0.05..2.0);
        let density: f32 = rng.random_range(3.5..5.5);
        let radius_earth_equiv = (mass / (density / 5.51)).powf(1.0 / 3.0);
        let radius_km = radius_earth_equiv * 6371.0;

        let mut tags = vec!["Terrestrial".to_string()];
        if orbit_au > 0.7 && orbit_au < 1.5 && rng.random_bool(0.3) {
            tags.push("Habitable".to_string());
        }

        (BodyType::Planet, radius_km, mass, tags)
    };

    let mut satellites = Vec::new();
    if rng.random_bool(0.4) {
        let num_moons = rng.random_range(1..if is_gas_giant { 6 } else { 3 });
        for j in 0..num_moons {
            let moon_mass: f32 = mass_earth * rng.random_range(0.0001..0.01);
            let moon_density: f32 = rng.random_range(2.0..3.5);
            let moon_radius_earth_equiv = (moon_mass / (moon_density / 5.51)).powf(1.0 / 3.0);

            satellites.push(OrbitalBody {
                id: gen_uuid(rng),
                name: format!("Moon {}", j + 1),
                body_type: BodyType::Moon,
                orbit_au: 0.005 * (j as f32 + 1.0) * rng.random_range(0.8..1.2),
                radius_km: moon_radius_earth_equiv * 6371.0,
                mass_earth: moon_mass,
                satellites: Vec::new(),
                tags: Vec::new(),
            });
        }
    }

    OrbitalBody {
        id: gen_uuid(rng),
        name: format!("Planet {}", index + 1),
        body_type,
        orbit_au,
        radius_km,
        mass_earth,
        satellites,
        tags,
    }
}

fn gen_uuid(rng: &mut impl Rng) -> Uuid {
    let bytes: [u8; 16] = rng.random();
    Uuid::from_bytes(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use std::collections::{HashMap, HashSet, VecDeque};

    const MIN_ORBIT_GAP_AU: f32 = 0.0001;

    fn body_type_name(body_type: &BodyType) -> &'static str {
        match body_type {
            BodyType::Planet => "Planet",
            BodyType::Moon => "Moon",
            BodyType::SpaceStation => "SpaceStation",
            BodyType::DwarfPlanet => "DwarfPlanet",
            BodyType::Comet => "Comet",
        }
    }

    fn body_signature(body: &OrbitalBody) -> Vec<u64> {
        let mut signature = vec![
            body.orbit_au.to_bits() as u64,
            body.radius_km.to_bits() as u64,
            body.mass_earth.to_bits() as u64,
            body.satellites.len() as u64,
        ];
        signature.extend(body.name.as_bytes().iter().map(|b| *b as u64));
        signature.extend(
            body_type_name(&body.body_type)
                .as_bytes()
                .iter()
                .map(|b| *b as u64),
        );
        for tag in &body.tags {
            signature.extend(tag.as_bytes().iter().map(|b| *b as u64));
        }
        for satellite in &body.satellites {
            signature.extend(body_signature(satellite));
        }
        signature
    }

    fn cluster_signature(cluster: &StarCluster) -> Vec<Vec<u64>> {
        let id_to_name: HashMap<_, _> = cluster
            .systems
            .iter()
            .map(|system| (system.id, system.name.clone()))
            .collect();

        cluster
            .systems
            .iter()
            .map(|system| {
                let mut signature = vec![
                    system.x.to_bits() as u64,
                    system.y.to_bits() as u64,
                    system.stars.len() as u64,
                    system.orbital_bodies.len() as u64,
                    system.orbital_regions.len() as u64,
                    system.portals.len() as u64,
                ];

                signature.extend(system.name.as_bytes().iter().map(|b| *b as u64));

                let mut portal_targets: Vec<_> = system
                    .portals
                    .iter()
                    .map(|portal| {
                        id_to_name
                            .get(&portal.target_system_id)
                            .expect("portal target must exist")
                            .clone()
                    })
                    .collect();
                portal_targets.sort();
                for target in portal_targets {
                    signature.extend(target.as_bytes().iter().map(|b| *b as u64));
                }

                for star in &system.stars {
                    signature.push(star.mass_sol.to_bits() as u64);
                    signature.push(star.radius_sol.to_bits() as u64);
                    signature.push(star.orbit_au.to_bits() as u64);
                    signature.push(star.companion_distance_au.to_bits() as u64);
                    signature.push(star.companion_angle_rad.to_bits() as u64);
                    signature.push(star.satellites.len() as u64);
                    signature.push(star.orbital_regions.len() as u64);
                    signature.extend(star.name.as_bytes().iter().map(|b| *b as u64));
                    signature.extend(star.spectral_class.as_bytes().iter().map(|b| *b as u64));

                    for body in &star.satellites {
                        signature.extend(body_signature(body));
                    }

                    for region in &star.orbital_regions {
                        signature.push(region.inner_radius_au.to_bits() as u64);
                        signature.push(region.outer_radius_au.to_bits() as u64);
                        signature.extend(region.name.as_bytes().iter().map(|b| *b as u64));
                    }
                }

                for body in &system.orbital_bodies {
                    signature.extend(body_signature(body));
                }

                for region in &system.orbital_regions {
                    signature.push(region.inner_radius_au.to_bits() as u64);
                    signature.push(region.outer_radius_au.to_bits() as u64);
                    signature.extend(region.name.as_bytes().iter().map(|b| *b as u64));
                }

                signature
            })
            .collect()
    }

    fn assert_positive_body_invariants(body: &OrbitalBody) {
        assert!(body.radius_km > 0.0, "body radius must be positive");
        assert!(body.mass_earth > 0.0, "body mass must be positive");

        for satellite in &body.satellites {
            assert_positive_body_invariants(satellite);
        }
    }

    fn assert_non_overlapping_orbits(bodies: &[OrbitalBody]) {
        let mut orbits: Vec<f32> = bodies.iter().map(|body| body.orbit_au).collect();
        orbits.sort_by(f32::total_cmp);

        for window in orbits.windows(2) {
            let gap = window[1] - window[0];
            assert!(
                gap > MIN_ORBIT_GAP_AU,
                "detected overlapping orbits, gap={gap}"
            );
        }
    }

    fn assert_cluster_is_connected(cluster: &StarCluster) {
        let systems = &cluster.systems;
        let mut id_to_index = HashMap::new();
        for (index, system) in systems.iter().enumerate() {
            id_to_index.insert(system.id, index);
        }

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(systems[0].id);
        visited.insert(systems[0].id);

        while let Some(current) = queue.pop_front() {
            let index = *id_to_index
                .get(&current)
                .expect("visited system id must be valid");
            for portal in &systems[index].portals {
                if visited.insert(portal.target_system_id) {
                    queue.push_back(portal.target_system_id);
                }
            }
        }

        assert_eq!(
            visited.len(),
            systems.len(),
            "cluster contains isolated systems"
        );
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(64))]

        #[test]
        fn test_generate_cluster_same_seed_returns_identical_results(seed in any::<u64>()) {
            let first = generate_cluster(seed);
            let second = generate_cluster(seed);

            prop_assert_eq!(cluster_signature(&first), cluster_signature(&second));
        }

        #[test]
        fn test_generate_cluster_seeded_structure_has_system_count_in_range(seed in any::<u64>()) {
            let cluster = generate_cluster(seed);

            prop_assert!((15..=25).contains(&cluster.systems.len()));
        }

        #[test]
        fn test_generate_cluster_seeded_portals_keep_every_system_reachable(seed in any::<u64>()) {
            let cluster = generate_cluster(seed);
            assert_cluster_is_connected(&cluster);
        }

        #[test]
        fn test_generate_cluster_seeded_bodies_obey_physical_invariants(seed in any::<u64>()) {
            let cluster = generate_cluster(seed);

            for system in &cluster.systems {
                assert_non_overlapping_orbits(&system.orbital_bodies);

                for star in &system.stars {
                    prop_assert!(star.radius_sol > 0.0);
                    prop_assert!(star.mass_sol > 0.0);

                    assert_non_overlapping_orbits(&star.satellites);

                    for body in &star.satellites {
                        assert_positive_body_invariants(body);
                    }
                }

                for body in &system.orbital_bodies {
                    assert_positive_body_invariants(body);
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_every_star_has_a_planet_or_asteroid_field() {
        for seed in 0_u64..512 {
            let cluster = generate_cluster(seed);
            for system in &cluster.systems {
                for star in &system.stars {
                    assert!(
                        !star.satellites.is_empty() || !star.orbital_regions.is_empty(),
                        "star {} in system {} has neither a planet nor an asteroid field",
                        star.name,
                        system.name
                    );
                }
            }
        }
    }

    #[test]
    fn test_generate_cluster_multistar_systems_have_individual_orbits_and_planetary_limits() {
        let mut found_multi_star_system = false;

        for seed in 0_u64..512 {
            let cluster = generate_cluster(seed);
            for system in &cluster.systems {
                if system.stars.len() < 2 {
                    continue;
                }

                found_multi_star_system = true;
                assert!((2..=3).contains(&system.stars.len()));

                for (index, star) in system.stars.iter().enumerate() {
                    if index == 0 {
                        assert_eq!(star.orbit_au, 0.0);
                    } else {
                        assert_ne!(star.orbit_au, 0.0);
                    }

                    let mut min_star_distance = f32::MAX;
                    for (other_index, other_star) in system.stars.iter().enumerate() {
                        if index == other_index {
                            continue;
                        }
                        let dx = star.companion_distance_au * star.companion_angle_rad.cos()
                            - other_star.companion_distance_au
                                * other_star.companion_angle_rad.cos();
                        let dy = star.companion_distance_au * star.companion_angle_rad.sin()
                            - other_star.companion_distance_au
                                * other_star.companion_angle_rad.sin();
                        let distance = dx.hypot(dy);
                        if distance > 0.01 {
                            min_star_distance = min_star_distance.min(distance);
                        }
                    }

                    if min_star_distance.is_finite() && !star.satellites.is_empty() {
                        let max_orbit = star
                            .satellites
                            .iter()
                            .map(|body| body.orbit_au)
                            .fold(0.0, f32::max);
                        let stable_limit = min_star_distance * 0.35;
                        assert!(max_orbit <= stable_limit + f32::EPSILON);
                    }
                }
            }
        }

        assert!(
            found_multi_star_system,
            "expected at least one generated multi-star system"
        );
    }

    #[test]
    fn test_generate_cluster_multistar_systems_use_main_star_relative_positions() {
        let mut found_multi_star_system = false;

        for seed in 0_u64..512 {
            let cluster = generate_cluster(seed);
            for system in &cluster.systems {
                if system.stars.len() < 2 {
                    continue;
                }

                found_multi_star_system = true;
                let main_star = &system.stars[0];
                assert_eq!(main_star.companion_distance_au, 0.0);
                assert_eq!(main_star.companion_angle_rad, 0.0);

                for companion in system.stars.iter().skip(1) {
                    assert!(
                        companion.companion_distance_au > 0.0,
                        "companion stars must store distance from the main star"
                    );
                    assert!(
                        (0.0..std::f32::consts::TAU).contains(&companion.companion_angle_rad),
                        "companion stars must store a relative angle in radians"
                    );
                    assert_eq!(
                        companion.orbit_au, companion.companion_distance_au,
                        "legacy star orbit radius mirrors the main-star-relative distance"
                    );
                }
            }
        }

        assert!(
            found_multi_star_system,
            "expected at least one generated multi-star system"
        );
    }
}
