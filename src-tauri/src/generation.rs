use crate::models::{StarCluster, SolarSystem, Star, OrbitalBody, BodyType, OrbitalRegion, Portal};
use uuid::Uuid;
use rand::prelude::*;
use rand::rngs::ThreadRng;
use delaunator::{Point, triangulate};

const SYSTEM_NAMES: &[&str] = &[
    "Alpha Centauri", "Sirius", "Epsilon Eridani", "Procyon", "61 Cygni",
    "Tau Ceti", "Vega", "Altair", "Fomalhaut", "Arcturus",
    "Pollux", "Capella", "Regulus", "Castor", "Spica",
    "Rigel", "Betelgeuse", "Deneb", "Antares", "Aldebaran"
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

pub fn generate_cluster(name: &str, system_count: usize) -> StarCluster {
    let mut rng = rand::rng();
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
    let points: Vec<Point> = systems.iter().map(|s| Point { x: s.x as f64, y: s.y as f64 }).collect();
    let tri = triangulate(&points);
    
    // Extract unique edges
    let mut edges = Vec::new();
    for i in 0..tri.triangles.len() / 3 {
        let t1 = tri.triangles[3 * i];
        let t2 = tri.triangles[3 * i + 1];
        let t3 = tri.triangles[3 * i + 2];
        
        for (u, v) in [(t1, t2), (t2, t3), (t3, t1)] {
            let (start, end) = if u < v { (u, v) } else { (v, u) };
            if !edges.contains(&(start, end)) {
                edges.push((start, end));
            }
        }
    }

    // Prune edges to meet degree constraints
    // Goal: most 2, some 1 or 3, rare 4
    let mut degrees = vec![0; system_count];
    let mut final_edges = Vec::new();

    // Shuffle edges to prune randomly
    edges.shuffle(&mut rng);

    for (u, v) in edges {
        let deg_u = degrees[u];
        let deg_v = degrees[v];

        // Probability to keep an edge based on current degrees
        let keep_prob = if deg_u < 2 && deg_v < 2 {
            0.9
        } else if deg_u < 3 && deg_v < 3 {
            0.4
        } else if deg_u < 4 && deg_v < 4 {
            0.05
        } else {
            0.01
        };

        if rng.random_bool(keep_prob) || (deg_u == 0 || deg_v == 0) { // Keep if it connects an isolated node
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
            id: Uuid::new_v4(),
            name: format!("Jump to {}", name_v),
            target_system_id: id_v,
        });
        systems[v].portals.push(Portal {
            id: Uuid::new_v4(),
            name: format!("Jump to {}", name_u),
            target_system_id: id_u,
        });
    }

    StarCluster {
        name: name.to_string(),
        systems,
    }
}

fn generate_solar_system(rng: &mut ThreadRng, name: String, x: f32, y: f32) -> SolarSystem {
    let id = Uuid::new_v4();
    
    // Determine number of stars
    let num_stars = if rng.random_bool(0.2) { // 20% binary/trinary
        if rng.random_bool(0.7) { 2 } else { 3 }
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
        stars.push(Star {
            id: Uuid::new_v4(),
            name: star_name,
            spectral_class: class_info.0.to_string(),
            mass_sol: class_info.1 * rng.random_range(0.9..1.1),
            radius_sol: class_info.2 * rng.random_range(0.9..1.1),
        });
    }

    // Generate orbital bodies
    let num_bodies = rng.random_range(3..10);
    let mut orbital_bodies = Vec::with_capacity(num_bodies);
    
    // Minimum orbit is based on star mass (roughly)
    let total_star_mass: f32 = stars.iter().map(|s| s.mass_sol).sum();
    let mut current_orbit = 0.3 * total_star_mass.sqrt() * rng.random_range(0.8..1.2);

    for i in 0..num_bodies {
        // Titius-Bode-like spacing
        current_orbit *= rng.random_range(1.4..2.0);
        
        orbital_bodies.push(generate_body(rng, i, current_orbit));
    }

    // Generate orbital regions (asteroid belts)
    let mut orbital_regions = Vec::new();
    if rng.random_bool(0.6) {
        let inner = current_orbit * rng.random_range(0.4..0.6);
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

fn generate_body(rng: &mut ThreadRng, index: usize, orbit_au: f32) -> OrbitalBody {
    let is_gas_giant = orbit_au > 4.0;
    
    let (body_type, radius_km, mass_earth, tags) = if is_gas_giant {
        let mass: f32 = rng.random_range(15.0..318.0); // Earth masses (Neptune to Jupiter)
        let density: f32 = rng.random_range(0.7..1.7); // g/cm3
        // Volume V = M / density. R = (3V/4pi)^(1/3)
        // Relative to Earth: R_earth = 6371km, M_earth = 5.97e24kg.
        // density_earth = 5.51 g/cm3.
        let radius_earth_equiv = (mass / (density / 5.51)).powf(1.0/3.0);
        let radius_km = radius_earth_equiv * 6371.0;
        
        (BodyType::Planet, radius_km, mass, vec!["Gas Giant".to_string()])
    } else {
        let mass: f32 = rng.random_range(0.05..2.0); // Earth masses
        let density: f32 = rng.random_range(3.5..5.5); // g/cm3
        let radius_earth_equiv = (mass / (density / 5.51)).powf(1.0/3.0);
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
            let moon_radius_earth_equiv = (moon_mass / (moon_density / 5.51)).powf(1.0/3.0);
            
            satellites.push(OrbitalBody {
                id: Uuid::new_v4(),
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
        id: Uuid::new_v4(),
        name: format!("Planet {}", index + 1),
        body_type,
        orbit_au,
        radius_km,
        mass_earth,
        satellites,
        tags,
    }
}
