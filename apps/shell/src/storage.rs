use procedural_gen::{generate_cluster, GenerationSettings, StarCluster};
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub struct StorageManager {
    file_path: PathBuf,
    settings_file_path: PathBuf,
}

impl StorageManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;

        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        }

        let file_path = app_dir.join("cluster.json");
        let settings_file_path = app_dir.join("generation_settings.json");
        Ok(Self {
            file_path,
            settings_file_path,
        })
    }

    #[cfg(test)]
    pub fn from_path(file_path: PathBuf) -> Self {
        let settings_file_path = file_path.with_file_name("generation_settings.json");
        Self {
            file_path,
            settings_file_path,
        }
    }

    pub fn load(&self) -> Result<StarCluster, String> {
        if !self.file_path.exists() {
            let cluster = self.create_default_cluster();
            if let Err(e) = self.save(&cluster) {
                eprintln!("Failed to save default cluster: {}", e);
            }
            return Ok(cluster);
        }

        Self::load_json(&self.file_path)?.ok_or_else(|| "cluster file disappeared".to_string())
    }

    pub fn save(&self, cluster: &StarCluster) -> Result<(), String> {
        Self::save_json(&self.file_path, cluster)
    }

    pub fn load_settings(&self) -> Result<GenerationSettings, String> {
        Ok(Self::load_json(&self.settings_file_path)?.unwrap_or_default())
    }

    pub fn save_settings(&self, settings: &GenerationSettings) -> Result<(), String> {
        Self::save_json(&self.settings_file_path, settings)
    }

    fn load_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
        if !path.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content)
            .map(Some)
            .map_err(|e| e.to_string())
    }

    fn save_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
        let content = serde_json::to_string_pretty(value)
            .map_err(|e| format!("Failed to serialize {}: {}", path.display(), e))?;

        let temp_path = path.with_extension("json.tmp");
        fs::write(&temp_path, content).map_err(|e| format!("Failed to write temp file: {}", e))?;
        fs::rename(&temp_path, path).map_err(|e| format!("Failed to rename temp file: {}", e))
    }

    fn create_default_cluster(&self) -> StarCluster {
        generate_cluster(42, &GenerationSettings::default()) // Use fixed seed for default cluster
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_save_load() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("cluster.json");
        let storage = StorageManager::from_path(file_path);

        let cluster = storage.create_default_cluster();
        storage.save(&cluster).unwrap();

        let loaded = storage.load().unwrap();
        assert_eq!(loaded.name, cluster.name);
        assert_eq!(loaded.systems.len(), cluster.systems.len());
    }

    #[test]
    fn test_load_default() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("nonexistent.json");
        let storage = StorageManager::from_path(file_path);

        let cluster = storage.load().unwrap();
        assert!(cluster.name.contains("Cluster 42"));
        assert!(cluster.systems.len() >= 15);
    }

    #[test]
    fn test_load_settings_returns_defaults_when_missing() {
        let dir = tempdir().unwrap();
        let storage = StorageManager::from_path(dir.path().join("cluster.json"));

        let settings = storage.load_settings().unwrap();
        assert_eq!(settings, GenerationSettings::default());
    }

    #[test]
    fn test_save_and_load_settings_round_trips() {
        let dir = tempdir().unwrap();
        let storage = StorageManager::from_path(dir.path().join("cluster.json"));

        let settings = GenerationSettings {
            system_count_min: 5,
            system_count_max: 10,
            ..GenerationSettings::default()
        };
        storage.save_settings(&settings).unwrap();

        let loaded = storage.load_settings().unwrap();
        assert_eq!(loaded, settings);
    }
}
