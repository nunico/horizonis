use std::fs;
use std::path::PathBuf;
use crate::models::StarCluster;
use tauri::{AppHandle, Manager};

pub struct StorageManager {
    file_path: PathBuf,
}

impl StorageManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle.path().app_data_dir()
            .map_err(|e| e.to_string())?;
        
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        }

        let file_path = app_dir.join("cluster.json");
        Ok(Self { file_path })
    }

    pub fn load(&self) -> Result<StarCluster, String> {
        if !self.file_path.exists() {
            return Ok(self.create_default_cluster());
        }

        let content = fs::read_to_string(&self.file_path)
            .map_err(|e| e.to_string())?;
        
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    pub fn save(&self, cluster: &StarCluster) -> Result<(), String> {
        let content = serde_json::to_string_pretty(cluster)
            .map_err(|e| e.to_string())?;
        
        fs::write(&self.file_path, content).map_err(|e| e.to_string())
    }

    fn create_default_cluster(&self) -> StarCluster {
        use uuid::Uuid;
        use crate::models::{SolarSystem, Star, BodyType, OrbitalBody};

        let sol_id = Uuid::new_v4();
        let star_id = Uuid::new_v4();
        let earth_id = Uuid::new_v4();

        StarCluster {
            name: "Default Sector".to_string(),
            systems: vec![
                SolarSystem {
                    id: sol_id,
                    name: "Sol".to_string(),
                    x: 0.0,
                    y: 0.0,
                    stars: vec![
                        Star {
                            id: star_id,
                            name: "Sol".to_string(),
                            spectral_class: "G2V".to_string(),
                            radius_sol: 1.0,
                        }
                    ],
                    orbital_bodies: vec![
                        OrbitalBody {
                            id: earth_id,
                            name: "Earth".to_string(),
                            body_type: BodyType::Planet,
                            orbit_au: 1.0,
                            satellites: vec![],
                            tags: vec!["Habitable".to_string()],
                        }
                    ],
                    orbital_regions: vec![],
                    portals: vec![],
                }
            ],
        }
    }
}
