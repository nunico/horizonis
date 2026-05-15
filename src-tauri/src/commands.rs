use crate::models::{StarCluster, SolarSystem};
use crate::storage::StorageManager;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub fn get_cluster(app_handle: AppHandle) -> Result<StarCluster, String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.load()
}

#[tauri::command]
pub fn save_cluster(app_handle: AppHandle, cluster: StarCluster) -> Result<(), String> {
    let storage = StorageManager::new(&app_handle)?;
    storage.save(&cluster)
}

#[tauri::command]
pub fn get_system(app_handle: AppHandle, system_id: Uuid) -> Result<SolarSystem, String> {
    let cluster = get_cluster(app_handle)?;
    cluster.systems.into_iter()
        .find(|s| s.id == system_id)
        .ok_or_else(|| "System not found".to_string())
}

#[tauri::command]
pub fn find_portal_route(app_handle: AppHandle, start_id: Uuid, end_id: Uuid) -> Result<Vec<Uuid>, String> {
    use petgraph::graph::UnGraph;
    use petgraph::algo::astar;
    use std::collections::HashMap;

    let cluster = get_cluster(app_handle)?;
    let mut graph = UnGraph::<Uuid, ()>::new_undirected();
    let mut nodes = HashMap::new();

    for system in &cluster.systems {
        let node_idx = graph.add_node(system.id);
        nodes.insert(system.id, node_idx);
    }

    for system in &cluster.systems {
        for portal in &system.portals {
            if let (Some(&u), Some(&v)) = (nodes.get(&system.id), nodes.get(&portal.target_system_id)) {
                graph.add_edge(u, v, ());
            }
        }
    }

    let start_node = nodes.get(&start_id).ok_or("Start system not found")?;
    let end_node = nodes.get(&end_id).ok_or("End system not found")?;

    let path = astar(&graph, *start_node, |finish| finish == *end_node, |_| 1, |_| 0);

    if let Some((_, route)) = path {
        Ok(route.into_iter().map(|idx| graph[idx]).collect())
    } else {
        Err("No route found".to_string())
    }
}
