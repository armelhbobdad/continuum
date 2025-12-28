//! Download state management
//!
//! Tracks active downloads and their progress.
//! Memory-only state (no persistence per ADR-DOWNLOAD-001).
//!
//! Story 2.3: Model Download Manager

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Download status enum matching TypeScript DownloadStatus
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

/// Progress event sent to frontend via Tauri events
/// Matches TypeScript DownloadProgress interface
#[derive(Clone, Serialize)]
pub struct DownloadProgressEvent {
    pub download_id: String,
    pub model_id: String,
    pub status: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub speed_bps: u64,
    pub eta_seconds: u64,
}

/// Internal download tracking
#[derive(Clone)]
pub struct Download {
    pub id: String,
    pub model_id: String,
    pub url: String,
    /// Final destination path (used after download completes)
    #[allow(dead_code)]
    pub file_path: std::path::PathBuf,
    pub part_path: std::path::PathBuf,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub status: DownloadStatus,
    /// Cancel token for aborting download
    pub cancel_token: Arc<tokio::sync::watch::Sender<bool>>,
}

impl Download {
    /// Create progress event from current state
    pub fn to_progress_event(&self, speed_bps: u64, eta_seconds: u64) -> DownloadProgressEvent {
        DownloadProgressEvent {
            download_id: self.id.clone(),
            model_id: self.model_id.clone(),
            status: match self.status {
                DownloadStatus::Queued => "queued",
                DownloadStatus::Downloading => "downloading",
                DownloadStatus::Paused => "paused",
                DownloadStatus::Completed => "completed",
                DownloadStatus::Failed => "failed",
                DownloadStatus::Cancelled => "cancelled",
            }
            .to_string(),
            bytes_downloaded: self.bytes_downloaded,
            total_bytes: self.total_bytes,
            speed_bps,
            eta_seconds,
        }
    }
}

/// Download state for tracking active downloads
pub struct DownloadState {
    /// Active downloads keyed by download_id
    downloads: RwLock<HashMap<String, Download>>,
    /// App data directory for storing models
    models_dir: std::path::PathBuf,
    /// HTTP client for downloads
    client: reqwest::Client,
}

impl DownloadState {
    /// Create new download state
    pub fn new(app_data_dir: std::path::PathBuf) -> Self {
        let models_dir = app_data_dir.join("models");

        // Ensure models directory exists
        if let Err(e) = std::fs::create_dir_all(&models_dir) {
            log::warn!("Failed to create models directory: {}", e);
        }

        // Configure client for large file downloads:
        // - No overall timeout (downloads can take hours)
        // - 30s connect timeout (for initial connection)
        // - Pool idle timeout for connection reuse
        let client = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(30))
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            downloads: RwLock::new(HashMap::new()),
            models_dir,
            client,
        }
    }

    /// Get the models directory path
    pub fn models_dir(&self) -> &std::path::Path {
        &self.models_dir
    }

    /// Get the HTTP client
    pub fn client(&self) -> &reqwest::Client {
        &self.client
    }

    /// Add a new download
    pub async fn add_download(&self, download: Download) {
        let mut downloads = self.downloads.write().await;
        downloads.insert(download.id.clone(), download);
    }

    /// Get a download by ID
    pub async fn get_download(&self, download_id: &str) -> Option<Download> {
        let downloads = self.downloads.read().await;
        downloads.get(download_id).cloned()
    }

    /// Update download progress
    ///
    /// TODO(Story 2.5+): Reserved for progress persistence/recovery after app restart.
    /// Currently progress is tracked in the download task itself.
    #[allow(dead_code)]
    pub async fn update_progress(&self, download_id: &str, bytes: u64, status: DownloadStatus) {
        let mut downloads = self.downloads.write().await;
        if let Some(download) = downloads.get_mut(download_id) {
            download.bytes_downloaded = bytes;
            download.status = status;
        }
    }

    /// Update download status
    pub async fn update_status(&self, download_id: &str, status: DownloadStatus) {
        let mut downloads = self.downloads.write().await;
        if let Some(download) = downloads.get_mut(download_id) {
            download.status = status;
        }
    }

    /// Remove a download
    pub async fn remove_download(&self, download_id: &str) -> Option<Download> {
        let mut downloads = self.downloads.write().await;
        downloads.remove(download_id)
    }

    /// Get all active downloads
    ///
    /// TODO(Story 2.5+): Reserved for download queue UI and batch operations.
    /// Currently individual downloads are fetched by ID.
    #[allow(dead_code)]
    pub async fn get_all_downloads(&self) -> Vec<Download> {
        let downloads = self.downloads.read().await;
        downloads.values().cloned().collect()
    }
}

/// Storage check result matching TypeScript StorageCheckResult
#[derive(Clone, Serialize)]
pub struct StorageCheckResult {
    pub has_space: bool,
    pub available_mb: u64,
    pub required_mb: u64,
    pub shortfall_mb: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_download_status_serialization() {
        let status = DownloadStatus::Downloading;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"downloading\"");
    }

    #[test]
    fn test_storage_check_result() {
        let result = StorageCheckResult {
            has_space: true,
            available_mb: 100_000,
            required_mb: 4_000,
            shortfall_mb: 0,
        };
        assert!(result.has_space);
    }
}
