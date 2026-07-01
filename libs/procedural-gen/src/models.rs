use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct StarCluster {
    pub name: String,
    pub systems: Vec<SolarSystem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct SolarSystem {
    pub id: Uuid,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub stars: Vec<Star>,
    pub orbital_bodies: Vec<OrbitalBody>,
    pub orbital_regions: Vec<OrbitalRegion>,
    pub portals: Vec<Portal>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct Star {
    pub id: Uuid,
    pub name: String,
    pub spectral_class: String,
    pub radius_sol: f32,
    pub mass_sol: f32,
    #[serde(default)]
    pub orbit_au: f32,
    #[serde(default)]
    pub companion_distance_au: f32,
    #[serde(default)]
    pub companion_angle_rad: f32,
    #[serde(default)]
    pub satellites: Vec<OrbitalBody>,
    #[serde(default)]
    pub orbital_regions: Vec<OrbitalRegion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct OrbitalBody {
    pub id: Uuid,
    pub name: String,
    pub body_type: BodyType,
    pub orbit_au: f32,
    pub radius_km: f32,
    pub mass_earth: f32,
    pub satellites: Vec<OrbitalBody>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub enum BodyType {
    Planet,
    Moon,
    SpaceStation,
    DwarfPlanet,
    Comet,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct OrbitalRegion {
    pub name: String,
    pub inner_radius_au: f32,
    pub outer_radius_au: f32,
    pub region_type: String, // e.g. "Asteroid Belt"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct Portal {
    pub id: Uuid,
    pub name: String,
    pub target_system_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct GenerationSettings {
    pub system_count_min: u32,
    pub system_count_max: u32,
    pub multi_star_chance: f32,
    pub trinary_ratio: f32,
    pub max_bodies_per_star: u32,
    pub asteroid_belt_chance: f32,
    pub disallow_circumbinary_bodies: bool,
}

impl Default for GenerationSettings {
    fn default() -> Self {
        GenerationSettings {
            system_count_min: 15,
            system_count_max: 25,
            multi_star_chance: 0.2,
            trinary_ratio: 0.3,
            max_bodies_per_star: 8,
            asteroid_belt_chance: 0.5,
            disallow_circumbinary_bodies: false,
        }
    }
}

impl GenerationSettings {
    /// Clamp to valid ranges so generation can never panic on a malformed or
    /// user-supplied struct (e.g. an empty `system_count_min..system_count_max`
    /// range would panic `Rng::random_range`).
    pub fn sanitized(&self) -> Self {
        let system_count_min = self.system_count_min.max(1);
        let system_count_max = self.system_count_max.max(system_count_min + 1);
        GenerationSettings {
            system_count_min,
            system_count_max,
            multi_star_chance: self.multi_star_chance.clamp(0.0, 1.0),
            trinary_ratio: self.trinary_ratio.clamp(0.0, 1.0),
            max_bodies_per_star: self.max_bodies_per_star,
            asteroid_belt_chance: self.asteroid_belt_chance.clamp(0.0, 1.0),
            disallow_circumbinary_bodies: self.disallow_circumbinary_bodies,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_generation_settings_matches_historical_hardcoded_behavior() {
        let settings = GenerationSettings::default();
        assert_eq!(settings.system_count_min, 15);
        assert_eq!(settings.system_count_max, 25);
        assert_eq!(settings.multi_star_chance, 0.2);
        assert_eq!(settings.trinary_ratio, 0.3);
        assert_eq!(settings.max_bodies_per_star, 8);
        assert_eq!(settings.asteroid_belt_chance, 0.5);
        assert!(!settings.disallow_circumbinary_bodies);
    }

    #[test]
    fn sanitized_clamps_out_of_range_values() {
        let settings = GenerationSettings {
            system_count_min: 0,
            system_count_max: 0,
            multi_star_chance: -1.0,
            trinary_ratio: 5.0,
            max_bodies_per_star: 0,
            asteroid_belt_chance: -0.5,
            disallow_circumbinary_bodies: true,
        };
        let sanitized = settings.sanitized();
        assert!(sanitized.system_count_min >= 1);
        assert!(sanitized.system_count_max > sanitized.system_count_min);
        assert_eq!(sanitized.multi_star_chance, 0.0);
        assert_eq!(sanitized.trinary_ratio, 1.0);
        assert_eq!(sanitized.max_bodies_per_star, 0);
        assert_eq!(sanitized.asteroid_belt_chance, 0.0);
        assert!(sanitized.disallow_circumbinary_bodies);
    }

    #[test]
    fn sanitized_leaves_valid_settings_unchanged() {
        let settings = GenerationSettings::default();
        assert_eq!(settings.sanitized(), settings);
    }
}
