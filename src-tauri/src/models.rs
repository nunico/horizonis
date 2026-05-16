use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StarCluster {
    pub name: String,
    pub systems: Vec<SolarSystem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct Star {
    pub id: Uuid,
    pub name: String,
    pub spectral_class: String,
    pub radius_sol: f32,
    pub mass_sol: f32,
    #[serde(default)]
    pub orbit_au: f32,
    #[serde(default)]
    pub satellites: Vec<OrbitalBody>,
    #[serde(default)]
    pub orbital_regions: Vec<OrbitalRegion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct OrbitalRegion {
    pub name: String,
    pub inner_radius_au: f32,
    pub outer_radius_au: f32,
    pub region_type: String, // e.g. "Asteroid Belt"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Portal {
    pub id: Uuid,
    pub name: String,
    pub target_system_id: Uuid,
}
