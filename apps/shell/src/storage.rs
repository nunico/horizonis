use procedural_gen::{generate_cluster, StarCluster};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct StorageManager {
    file_path: PathBuf,
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
        Ok(Self { file_path })
    }

    #[cfg(test)]
    pub fn from_path(file_path: PathBuf) -> Self {
        Self { file_path }
    }

    pub fn load(&self) -> Result<StarCluster, String> {
        if !self.file_path.exists() {
            let cluster = self.create_default_cluster();
            if let Err(e) = self.save(&cluster) {
                eprintln!("Failed to save default cluster: {}", e);
            }
            return Ok(cluster);
        }

        let content = fs::read_to_string(&self.file_path).map_err(|e| e.to_string())?;

        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    pub fn save(&self, cluster: &StarCluster) -> Result<(), String> {
        let content = serde_json::to_string_pretty(cluster)
            .map_err(|e| format!("Failed to serialize cluster: {}", e))?;

        let temp_path = self.file_path.with_extension("json.tmp");
        fs::write(&temp_path, content).map_err(|e| format!("Failed to write temp file: {}", e))?;
        fs::rename(&temp_path, &self.file_path)
            .map_err(|e| format!("Failed to rename temp file: {}", e))
    }

    fn create_default_cluster(&self) -> StarCluster {
        generate_cluster(42) // Use fixed seed for default cluster
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
}
