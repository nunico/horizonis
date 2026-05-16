mod models;
mod storage;
mod commands;
mod generation;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_cluster,
            commands::get_system,
            commands::save_cluster,
            commands::find_portal_route
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
