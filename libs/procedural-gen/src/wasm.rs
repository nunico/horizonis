use crate::generation;
use crate::models::{GenerationSettings, StarCluster};
use crate::routing;
use uuid::Uuid;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn generate_cluster(seed: u64, settings: JsValue) -> Result<JsValue, JsValue> {
    let settings: GenerationSettings = serde_wasm_bindgen::from_value(settings)
        .map_err(|e| JsValue::from_str(&format!("Invalid settings: {}", e)))?;
    let cluster = generation::generate_cluster(seed, &settings);
    serde_wasm_bindgen::to_value(&cluster).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn compute_route(
    cluster: JsValue,
    start_id_val: JsValue,
    end_id_val: JsValue,
) -> Result<JsValue, JsValue> {
    let cluster: StarCluster = serde_wasm_bindgen::from_value(cluster)
        .map_err(|e| JsValue::from_str(&format!("Invalid cluster: {}", e)))?;
    let start_id: Uuid = serde_wasm_bindgen::from_value(start_id_val)
        .map_err(|e| JsValue::from_str(&format!("Invalid start_id: {}", e)))?;
    let end_id: Uuid = serde_wasm_bindgen::from_value(end_id_val)
        .map_err(|e| JsValue::from_str(&format!("Invalid end_id: {}", e)))?;

    let route =
        routing::compute_route(&cluster, start_id, end_id).map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&route).map_err(|e| JsValue::from_str(&e.to_string()))
}
