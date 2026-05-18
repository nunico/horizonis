use procedural_gen::{StarCluster, SolarSystem, compute_route};
use crate::storage::StorageManager;
use crate::AppState;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[tauri::command]
pub fn get_cluster(app_handle: AppHandle, state: State<'_, AppState>) -> Result<StarCluster, String> {
    // Check cache first
    {
        let cache = state.cluster.lock().map_err(|e| e.to_string())?;
        if let Some(cluster) = &*cache {
            return Ok(cluster.clone());
        }
    }

    // Load from disk if not in cache
    let storage = StorageManager::new(&app_handle)?;
    let cluster = storage.load()?;

    // Update cache
    let mut cache = state.cluster.lock().map_err(|e| e.to_string())?;
    *cache = Some(cluster.clone());

    Ok(cluster)
}

#[tauri::command]
pub fn generate_cluster(app_handle: AppHandle, state: State<'_, AppState>, seed: Option<u64>) -> Result<StarCluster, String> {
    let seed = seed.unwrap_or_else(|| rand::random::<u64>());
    let cluster = procedural_gen::generate_cluster(seed);
    
    // Save to disk and update cache
    save_cluster(app_handle, state, cluster.clone())?;
    
    Ok(cluster)
}

#[tauri::command]
pub fn save_cluster(app_handle: AppHandle, state: State<'_, AppState>, cluster: StarCluster) -> Result<(), String> {
    // Save to disk
    let storage = StorageManager::new(&app_handle)?;
    storage.save(&cluster)?;

    // Update cache
    let mut cache = state.cluster.lock().map_err(|e| e.to_string())?;
    *cache = Some(cluster);

    Ok(())
}

#[tauri::command]
pub fn get_system(app_handle: AppHandle, state: State<'_, AppState>, system_id: Uuid) -> Result<SolarSystem, String> {
    let cluster = get_cluster(app_handle, state)?;
    cluster.systems.into_iter()
        .find(|s| s.id == system_id)
        .ok_or_else(|| "System not found".to_string())
}

#[tauri::command]
pub fn find_portal_route(app_handle: AppHandle, state: State<'_, AppState>, start_id: Uuid, end_id: Uuid) -> Result<Vec<Uuid>, String> {
    let cluster = get_cluster(app_handle, state)?;
    compute_route(&cluster, start_id, end_id)
}
