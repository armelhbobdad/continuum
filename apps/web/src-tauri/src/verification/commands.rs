//! Tauri commands for model integrity verification (Story 2.5)

// File sizes displayed in MB don't need full f64 precision
#![allow(clippy::cast_precision_loss)]

use super::{VerificationProgress, VerificationResult};
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::State;

/// Quarantined file information
#[derive(Debug, Clone, serde::Serialize)]
pub struct QuarantinedFile {
    pub id: String,
    pub model_id: String,
    pub timestamp: String,
    pub expected_hash: String,
    pub actual_hash: String,
    pub file_path: String,
    pub file_size_mb: f64,
}

/// State for verification module
pub struct VerificationState {
    pub app_data_dir: PathBuf,
}

impl VerificationState {
    pub const fn new(app_data_dir: PathBuf) -> Self {
        Self { app_data_dir }
    }

    /// Get the models directory
    pub fn models_dir(&self) -> PathBuf {
        self.app_data_dir.join("models")
    }

    /// Get the quarantine directory
    pub fn quarantine_dir(&self) -> PathBuf {
        self.app_data_dir.join("quarantine")
    }
}

/// Verify a downloaded model's integrity
#[tauri::command]
pub async fn verify_model_integrity(
    model_id: String,
    expected_hash: String,
    state: State<'_, VerificationState>,
    on_progress: Channel<VerificationProgress>,
) -> Result<VerificationResult, String> {
    let model_path = state.models_dir().join(&model_id).join("model.gguf");

    if !model_path.exists() {
        return Err(format!("Model file not found: {}", model_path.display()));
    }

    super::verify_integrity_with_progress(&model_path, &expected_hash, Some(&on_progress))
        .map_err(|e| e.message)
}

/// Compute checksum of a model file
#[tauri::command]
pub async fn compute_model_checksum(
    model_id: String,
    state: State<'_, VerificationState>,
    on_progress: Channel<VerificationProgress>,
) -> Result<String, String> {
    let model_path = state.models_dir().join(&model_id).join("model.gguf");

    if !model_path.exists() {
        return Err(format!("Model file not found: {}", model_path.display()));
    }

    super::compute_checksum_with_progress(&model_path, Some(&on_progress)).map_err(|e| e.message)
}

/// List all quarantined files
#[tauri::command]
pub async fn list_quarantined_files(
    state: State<'_, VerificationState>,
) -> Result<Vec<QuarantinedFile>, String> {
    let quarantine_dir = state.quarantine_dir();

    if !quarantine_dir.exists() {
        return Ok(vec![]);
    }

    let mut files = Vec::new();

    let entries = std::fs::read_dir(&quarantine_dir)
        .map_err(|e| format!("Failed to read quarantine directory: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("corrupted") {
            // Parse filename: {model_id}_{timestamp}.gguf.corrupted
            let filename = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_default();

            // Try to parse the filename pattern
            if let Some((model_id, timestamp)) = parse_quarantine_filename(filename) {
                let metadata = std::fs::metadata(&path).ok();
                let file_size_mb = metadata.map_or(0.0, |m| m.len() as f64 / (1024.0 * 1024.0));

                files.push(QuarantinedFile {
                    id: filename.to_string(),
                    model_id,
                    timestamp,
                    expected_hash: "unknown".to_string(), // Would need to store metadata separately
                    actual_hash: "unknown".to_string(),
                    file_path: path.to_string_lossy().to_string(),
                    file_size_mb,
                });
            }
        }
    }

    Ok(files)
}

/// Delete a specific quarantined file (user-triggered only)
#[tauri::command]
pub async fn delete_quarantined_file(
    file_id: String,
    state: State<'_, VerificationState>,
) -> Result<(), String> {
    let quarantine_dir = state.quarantine_dir();

    // Find the file matching the ID
    let entries = std::fs::read_dir(&quarantine_dir)
        .map_err(|e| format!("Failed to read quarantine directory: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let filename = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default();

        if filename == file_id {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete quarantined file: {e}"))?;
            return Ok(());
        }
    }

    Err(format!("Quarantined file not found: {file_id}"))
}

/// Parse quarantine filename: {model_id}_{timestamp}.gguf -> (model_id, timestamp)
/// Made public for testing
pub fn parse_quarantine_filename(filename: &str) -> Option<(String, String)> {
    // Remove .gguf suffix if present
    let name = filename.strip_suffix(".gguf").unwrap_or(filename);

    // Find the last underscore (timestamp separator)
    let last_underscore = name.rfind('_')?;

    // Extract timestamp (should be YYYYMMDD_HHMMSS format, 15 chars)
    if name.len() < last_underscore + 7 {
        return None;
    }

    // Find the second-to-last underscore for the timestamp separator
    let timestamp_start = name[..last_underscore].rfind('_').unwrap_or(0);

    if timestamp_start == 0 {
        // Only one underscore, model_id is before it
        let model_id = name[..last_underscore].to_string();
        let timestamp = name[last_underscore + 1..].to_string();
        Some((model_id, timestamp))
    } else {
        // Multiple underscores, last two parts are timestamp
        let model_id = name[..timestamp_start].to_string();
        let timestamp = name[timestamp_start + 1..].to_string();
        Some((model_id, timestamp))
    }
}
