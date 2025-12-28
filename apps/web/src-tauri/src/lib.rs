mod hardware;
mod inference;

use hardware::HardwareState;
use inference::InferenceState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(InferenceState::new())
        .manage(HardwareState::new())
        .invoke_handler(tauri::generate_handler![
            // Inference commands (Story 1.4)
            inference::load_model,
            inference::generate,
            inference::abort_inference,
            inference::get_model_status,
            inference::unload_model,
            // Hardware commands (Story 2.1)
            hardware::get_system_info,
            hardware::get_gpu_info,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                app.handle().plugin(tauri_plugin_mcp_bridge::init())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
