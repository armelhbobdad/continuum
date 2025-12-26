mod inference;

use inference::InferenceState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(InferenceState::new())
        .invoke_handler(tauri::generate_handler![
            inference::load_model,
            inference::generate,
            inference::abort_inference,
            inference::get_model_status,
            inference::unload_model,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
