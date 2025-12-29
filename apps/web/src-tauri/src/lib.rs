mod downloads;
mod hardware;
mod inference;
mod verification;

use downloads::DownloadState;
use hardware::HardwareState;
use inference::InferenceState;
use verification::commands::VerificationState;
use tauri::Manager;

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
            // Download commands (Story 2.3)
            downloads::start_download,
            downloads::pause_download,
            downloads::resume_download,
            downloads::cancel_download,
            downloads::get_download_progress,
            downloads::check_storage_space,
            downloads::get_model_path,
            downloads::get_partial_download_size,
            downloads::delete_model,
            // Verification commands (Story 2.5)
            verification::commands::verify_model_integrity,
            verification::commands::compute_model_checksum,
            verification::commands::list_quarantined_files,
            verification::commands::delete_quarantined_file,
        ])
        .setup(|app| {
            // Initialize download state with app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            app.manage(DownloadState::new(app_data_dir.clone()));
            app.manage(VerificationState::new(app_data_dir));

            // Notification plugin (Story 2.3)
            app.handle().plugin(tauri_plugin_notification::init())?;

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
