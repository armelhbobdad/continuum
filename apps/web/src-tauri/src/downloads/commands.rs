//! Tauri commands for download management
//!
//! Story 2.3: Model Download Manager
//! AC1: Download progress display
//! AC2: Pause/Resume/Cancel controls
//! AC3: Download completion handling
//! AC4: Network recovery (via resume capability)
//! AC5: Storage space validation

use super::manager;
use super::state::{DownloadProgressEvent, DownloadState, StorageCheckResult};
use sysinfo::Disks;
use tauri::{AppHandle, State};

/// Start downloading a model and its tokenizer
///
/// Returns the download_id for tracking progress.
/// Progress updates are emitted via the `download_progress` Tauri event.
///
/// File structure:
/// ```
/// models/{model_id}/
///   model.gguf       <- main model weights
///   tokenizer.json   <- tokenizer for the model
/// ```
///
/// # Arguments
/// * `model_id` - The model identifier
/// * `url` - The download URL for the GGUF model
/// * `tokenizer_url` - The download URL for the tokenizer.json
/// * `expected_hash` - Optional SHA-256 hash for verification (Story 2.5)
///
/// # Returns
/// * `download_id` - Unique ID for tracking this download
#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    model_id: String,
    url: String,
    tokenizer_url: String,
    expected_hash: Option<String>,
    state: State<'_, DownloadState>,
) -> Result<String, String> {
    manager::start_download(&app, &state, &model_id, &url, &tokenizer_url, expected_hash.as_deref()).await
}

/// Pause an active download
///
/// The partial file is preserved for later resume.
///
/// # Arguments
/// * `download_id` - The download ID to pause
#[tauri::command]
pub async fn pause_download(
    download_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    manager::pause_download(&state, &download_id).await
}

/// Resume a paused download
///
/// Continues from where the download left off using HTTP Range headers.
///
/// # Arguments
/// * `download_id` - The download ID to resume
#[tauri::command]
pub async fn resume_download(
    app: AppHandle,
    download_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    manager::resume_download(&app, &state, &download_id).await
}

/// Cancel a download and clean up partial files
///
/// # Arguments
/// * `download_id` - The download ID to cancel
#[tauri::command]
pub async fn cancel_download(
    app: AppHandle,
    download_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    manager::cancel_download(&app, &state, &download_id).await
}

/// Get current progress for a download
///
/// # Arguments
/// * `download_id` - The download ID to query
///
/// # Returns
/// * `Some(DownloadProgressEvent)` - Current progress
/// * `None` - Download not found
#[tauri::command]
pub async fn get_download_progress(
    download_id: String,
    state: State<'_, DownloadState>,
) -> Result<Option<DownloadProgressEvent>, String> {
    if let Some(download) = state.get_download(&download_id).await {
        Ok(Some(download.to_progress_event(0, 0)))
    } else {
        Ok(None)
    }
}

/// Check if there's enough storage space for a download (AC5)
///
/// # Arguments
/// * `required_mb` - Required space in megabytes
///
/// # Returns
/// * `StorageCheckResult` - Contains has_space, available_mb, required_mb, shortfall_mb
#[tauri::command]
pub fn check_storage_space(required_mb: u64) -> Result<StorageCheckResult, String> {
    let disks = Disks::new_with_refreshed_list();
    let available_bytes: u64 = disks.iter().map(|d| d.available_space()).sum();

    let available_mb = available_bytes / 1024 / 1024;
    let has_space = available_mb >= required_mb;

    Ok(StorageCheckResult {
        has_space,
        available_mb,
        required_mb,
        shortfall_mb: if has_space {
            0
        } else {
            required_mb.saturating_sub(available_mb)
        },
    })
}

/// Get model file path for a downloaded model
///
/// # Arguments
/// * `model_id` - The model identifier
///
/// # Returns
/// * `Some(path)` - Path to the model file if it exists
/// * `None` - Model not downloaded
#[tauri::command]
pub async fn get_model_path(
    model_id: String,
    state: State<'_, DownloadState>,
) -> Result<Option<String>, String> {
    // Model is stored in: models/{model_id}/model.gguf
    let file_path = state.models_dir().join(&model_id).join("model.gguf");

    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

/// Check if a partial download exists for a model
///
/// # Arguments
/// * `model_id` - The model identifier
///
/// # Returns
/// * `Some(bytes)` - Number of bytes already downloaded
/// * `None` - No partial download exists
#[tauri::command]
pub async fn get_partial_download_size(
    model_id: String,
    state: State<'_, DownloadState>,
) -> Result<Option<u64>, String> {
    // Partial download is stored in: models/{model_id}/model.gguf.part
    let part_path = state.models_dir().join(&model_id).join("model.gguf.part");

    if part_path.exists() {
        let metadata = std::fs::metadata(&part_path)
            .map_err(|e| format!("Failed to read partial file: {}", e))?;
        Ok(Some(metadata.len()))
    } else {
        Ok(None)
    }
}

/// Delete a downloaded model and its tokenizer
///
/// Removes the entire model directory: models/{model_id}/
///
/// # Arguments
/// * `model_id` - The model identifier
#[tauri::command]
pub async fn delete_model(
    model_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    let model_dir = state.models_dir().join(&model_id);

    // Delete the entire model directory
    if model_dir.exists() {
        std::fs::remove_dir_all(&model_dir)
            .map_err(|e| format!("Failed to delete model directory: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_storage_space() {
        // Should work on any system
        let result = check_storage_space(1).unwrap();

        // Most systems have at least 1MB free
        assert!(result.available_mb > 0);
        assert_eq!(result.required_mb, 1);
    }

    #[test]
    fn test_storage_check_with_large_requirement() {
        // Request an impossibly large amount
        let result = check_storage_space(1_000_000_000).unwrap(); // 1 petabyte

        assert!(!result.has_space);
        assert!(result.shortfall_mb > 0);
    }
}
