use crate::models::{StarCluster, SolarSystem};
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

pub fn compute_route(cluster: &StarCluster, start_id: Uuid, end_id: Uuid) -> Result<Vec<Uuid>, String> {
    use petgraph::graph::UnGraph;
    use petgraph::algo::astar;
    use std::collections::HashMap;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{SolarSystem, Portal};

    #[test]
    fn test_compute_route() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let id3 = Uuid::new_v4();

        let cluster = StarCluster {
            name: "Test".to_string(),
            systems: vec![
                SolarSystem {
                    id: id1,
                    name: "S1".to_string(),
                    x: 0.0, y: 0.0,
                    stars: vec![], orbital_bodies: vec![], orbital_regions: vec![],
                    portals: vec![Portal { id: Uuid::new_v4(), name: "P1".to_string(), target_system_id: id2 }],
                },
                SolarSystem {
                    id: id2,
                    name: "S2".to_string(),
                    x: 1.0, y: 1.0,
                    stars: vec![], orbital_bodies: vec![], orbital_regions: vec![],
                    portals: vec![Portal { id: Uuid::new_v4(), name: "P2".to_string(), target_system_id: id3 }],
                },
                SolarSystem {
                    id: id3,
                    name: "S3".to_string(),
                    x: 2.0, y: 2.0,
                    stars: vec![], orbital_bodies: vec![], orbital_regions: vec![],
                    portals: vec![],
                },
            ],
        };

        let route = compute_route(&cluster, id1, id3).unwrap();
        assert_eq!(route.len(), 3);
        assert_eq!(route[0], id1);
        assert_eq!(route[1], id2);
        assert_eq!(route[2], id3);
    }

    #[test]
    fn test_no_route() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();

        let cluster = StarCluster {
            name: "Test".to_string(),
            systems: vec![
                SolarSystem {
                    id: id1,
                    name: "S1".to_string(),
                    x: 0.0, y: 0.0,
                    stars: vec![], orbital_bodies: vec![], orbital_regions: vec![],
                    portals: vec![],
                },
                SolarSystem {
                    id: id2,
                    name: "S2".to_string(),
                    x: 1.0, y: 1.0,
                    stars: vec![], orbital_bodies: vec![], orbital_regions: vec![],
                    portals: vec![],
                },
            ],
        };

        let result = compute_route(&cluster, id1, id2);
        assert!(result.is_err());
    }
}
