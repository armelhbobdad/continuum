//! Continuum Tauri Backend
//!
//! This crate provides the Rust backend for the Continuum desktop application,
//! implementing local LLM inference, model management, and hardware detection.
//!
//! # Features
//!
//! - **Inference**: Local LLM generation using Kalosm (Story 1.4)
//! - **Hardware Detection**: RAM, CPU, GPU, and storage detection (Story 2.1)
//! - **Model Downloads**: Resumable downloads with pause/cancel (Story 2.3)
//! - **Integrity Verification**: SHA-256 verification with quarantine (Story 2.5)
//! - **Credential Bridge**: Secure credential storage in Rust (Story 5.1)
//! - **OAuth Authentication**: 3-tier fallback OAuth flow (Story 5.3)

// Application startup legitimately uses expect() for fatal initialization errors
#![allow(clippy::expect_used)]
// Tauri's generate_context! macro allocates large stack frames - this is unavoidable
#![allow(clippy::large_stack_frames)]

mod auth;
mod connectivity;
mod credentials;
mod downloads;
mod hardware;
mod inference;
mod preflight;
mod verification;

use auth::OAuthManagedState;
use credentials::CredentialState;
use downloads::DownloadState;
use hardware::HardwareState;
use inference::InferenceState;
use tauri::Manager;
use verification::commands::VerificationState;

/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(InferenceState::new())
        .manage(HardwareState::new())
        .manage(OAuthManagedState::new())
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
            // Connectivity commands (Story 4.1)
            connectivity::check_connectivity,
            // Preflight commands (Story 4.3)
            preflight::check_model_ready,
            preflight::preflight_storage_check,
            preflight::check_ram_availability,
            preflight::check_gpu_capability,
            // Credential commands (Story 5.1)
            credentials::get_auth_status,
            credentials::get_session_token,
            credentials::clear_credentials,
            credentials::check_credential_availability,
            credentials::validate_credentials,
            // Credential storage commands (Story 5.2)
            credentials::get_storage_info,
            credentials::get_storage_tier,
            // Offline authentication commands (Story 5.4)
            credentials::validate_offline_credentials,
            credentials::get_offline_status,
            credentials::refresh_credentials,
            credentials::get_degraded_mode,
            // Migration commands (Story 5.5)
            credentials::start_session_migration,
            credentials::get_migration_progress,
            credentials::get_migration_status,
            credentials::get_migration_result,
            credentials::cancel_migration,
            credentials::get_anonymous_session_count,
            credentials::reset_migration,
            // OAuth commands (Story 5.3)
            auth::start_oauth_flow,
            auth::get_oauth_progress,
            auth::submit_manual_code,
            auth::cancel_oauth_flow,
            auth::get_oauth_authorization_url,
            auth::handle_oauth_callback,
            auth::fallback_to_local_server,
            auth::fallback_to_manual_entry,
            auth::exchange_oauth_tokens,
        ])
        .setup(|app| {
            // Initialize states that need app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            app.manage(DownloadState::new(app_data_dir.clone()));
            app.manage(VerificationState::new(app_data_dir.clone()));
            // Credential state with storage tier detection (Story 5.2)
            app.manage(CredentialState::new_with_storage(app_data_dir));

            // Notification plugin (Story 2.3)
            app.handle().plugin(tauri_plugin_notification::init())?;

            // Shell plugin (Story 5.3 - opening OAuth URLs in browser)
            app.handle().plugin(tauri_plugin_shell::init())?;

            // Deep link plugin (Story 5.3 - OAuth callbacks)
            app.handle().plugin(tauri_plugin_deep_link::init())?;

            // Register deep link event handler for OAuth callbacks
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let app_handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        let url_str = url.to_string();
                        if url_str.starts_with("continuum://callback") {
                            let oauth_state = app_handle.state::<OAuthManagedState>();
                            let oauth_state_clone = oauth_state.inner().clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = oauth_state_clone.handle_deep_link(&url_str).await {
                                    log::error!("Failed to handle OAuth deep link: {e}");
                                }
                            });
                        }
                    }
                });
            }

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
