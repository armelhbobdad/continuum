//! Download manager for resumable model downloads
//!
//! Implements chunked downloads with HTTP Range headers for resume capability.
//! Uses .part files to track partial downloads.
//!
//! Story 2.3: Model Download Manager
//! ADR-DOWNLOAD-002: Chunked downloads with resume capability

use super::state::{Download, DownloadProgressEvent, DownloadState, DownloadStatus};
use futures_util::StreamExt;
use log::{error, info, warn};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::watch;
use uuid::Uuid;

/// Progress update interval (100ms per ADR-DOWNLOAD-003)
const PROGRESS_UPDATE_INTERVAL: Duration = Duration::from_millis(100);

/// Start a new download
///
/// Returns the download_id for tracking.
/// Downloads are stored as .part files until complete.
pub async fn start_download(
    app: &AppHandle,
    state: &DownloadState,
    model_id: &str,
    url: &str,
) -> Result<String, String> {
    let download_id = Uuid::new_v4().to_string();

    // Determine file paths
    let file_name = format!("{}.gguf", model_id);
    let file_path = state.models_dir().join(&file_name);
    let part_path = state.models_dir().join(format!("{}.part", file_name));

    // Check for existing partial download
    let mut bytes_downloaded = 0u64;
    if part_path.exists() {
        bytes_downloaded = std::fs::metadata(&part_path)
            .map(|m| m.len())
            .unwrap_or(0);
        info!(
            "Resuming download for {} from {} bytes",
            model_id, bytes_downloaded
        );
    }

    // Get total size with HEAD request
    let total_bytes = get_content_length(state.client(), url).await?;

    // Create cancel token for abort support
    let (cancel_tx, cancel_rx) = watch::channel(false);

    let download = Download {
        id: download_id.clone(),
        model_id: model_id.to_string(),
        url: url.to_string(),
        file_path: file_path.clone(),
        part_path: part_path.clone(),
        bytes_downloaded,
        total_bytes,
        status: DownloadStatus::Downloading,
        cancel_token: Arc::new(cancel_tx),
    };

    state.add_download(download).await;

    // Clone values for async task
    let app_handle = app.clone();
    let client = state.client().clone();
    let url = url.to_string();
    let model_id = model_id.to_string();
    let id = download_id.clone();

    // Spawn download task
    tokio::spawn(async move {
        let result = download_file(
            &app_handle,
            &client,
            &url,
            &part_path,
            &file_path,
            bytes_downloaded,
            total_bytes,
            &id,
            &model_id,
            cancel_rx,
        )
        .await;

        if let Err(e) = result {
            error!("Download failed for {}: {}", model_id, e);
            // Emit failure event
            let _ = app_handle.emit(
                "download_progress",
                DownloadProgressEvent {
                    download_id: id,
                    model_id,
                    status: "failed".to_string(),
                    bytes_downloaded,
                    total_bytes,
                    speed_bps: 0,
                    eta_seconds: 0,
                },
            );
        }
    });

    Ok(download_id)
}

/// Get content length via HEAD request
async fn get_content_length(client: &reqwest::Client, url: &str) -> Result<u64, String> {
    let response = client
        .head(url)
        .send()
        .await
        .map_err(|e| format!("HEAD request failed: {}", e))?;

    response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or_else(|| "Could not determine file size".to_string())
}

/// Download file with resume support
#[allow(clippy::too_many_arguments)]
async fn download_file(
    app: &AppHandle,
    client: &reqwest::Client,
    url: &str,
    part_path: &PathBuf,
    final_path: &PathBuf,
    mut bytes_downloaded: u64,
    total_bytes: u64,
    download_id: &str,
    model_id: &str,
    #[allow(unused_mut)] mut cancel_rx: watch::Receiver<bool>,
) -> Result<(), String> {
    // Build request with Range header for resume
    let mut request = client.get(url);
    if bytes_downloaded > 0 {
        request = request.header("Range", format!("bytes={}-", bytes_downloaded));
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    // Check for successful response
    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(format!("HTTP error: {}", response.status()));
    }

    // Open file for appending
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(part_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let start_time = Instant::now();
    let mut last_update = Instant::now();
    let start_bytes = bytes_downloaded;

    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        // Check for cancellation
        if *cancel_rx.borrow() {
            info!("Download cancelled: {}", model_id);
            return Err("cancelled".to_string());
        }

        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;

        file.write_all(&chunk)
            .map_err(|e| format!("Write error: {}", e))?;

        bytes_downloaded += chunk.len() as u64;

        // Update progress at interval
        if last_update.elapsed() >= PROGRESS_UPDATE_INTERVAL {
            let elapsed = start_time.elapsed().as_secs_f64();
            let bytes_since_start = bytes_downloaded.saturating_sub(start_bytes);
            let speed_bps = if elapsed > 0.0 {
                (bytes_since_start as f64 / elapsed) as u64
            } else {
                0
            };
            let remaining_bytes = total_bytes.saturating_sub(bytes_downloaded);
            let eta_seconds = if speed_bps > 0 {
                remaining_bytes / speed_bps
            } else {
                0
            };

            let _ = app.emit(
                "download_progress",
                DownloadProgressEvent {
                    download_id: download_id.to_string(),
                    model_id: model_id.to_string(),
                    status: "downloading".to_string(),
                    bytes_downloaded,
                    total_bytes,
                    speed_bps,
                    eta_seconds,
                },
            );

            last_update = Instant::now();
        }
    }

    // Sync and close file
    file.sync_all()
        .map_err(|e| format!("Sync error: {}", e))?;
    drop(file);

    // TODO(Story 2.5): Add checksum verification before rename
    // - Compute SHA256 of downloaded .part file
    // - Compare against expected checksum from model registry
    // - Fail with specific error if mismatch (corrupted download)
    // See: Task 3.7 in story file

    // Rename .part to final file
    std::fs::rename(part_path, final_path)
        .map_err(|e| format!("Rename failed: {}", e))?;

    info!("Download completed: {}", model_id);

    // Emit completion event
    let _ = app.emit(
        "download_progress",
        DownloadProgressEvent {
            download_id: download_id.to_string(),
            model_id: model_id.to_string(),
            status: "completed".to_string(),
            bytes_downloaded: total_bytes,
            total_bytes,
            speed_bps: 0,
            eta_seconds: 0,
        },
    );

    Ok(())
}

/// Pause a download
pub async fn pause_download(state: &DownloadState, download_id: &str) -> Result<(), String> {
    if let Some(download) = state.get_download(download_id).await {
        // Signal cancellation (pause is effectively a cancel that keeps the .part file)
        let _ = download.cancel_token.send(true);
        state
            .update_status(download_id, DownloadStatus::Paused)
            .await;
        info!("Download paused: {}", download_id);
        Ok(())
    } else {
        Err("Download not found".to_string())
    }
}

/// Resume a paused download
pub async fn resume_download(
    app: &AppHandle,
    state: &DownloadState,
    download_id: &str,
) -> Result<(), String> {
    if let Some(download) = state.get_download(download_id).await {
        if download.status != DownloadStatus::Paused {
            return Err("Download is not paused".to_string());
        }

        // Remove old download entry
        state.remove_download(download_id).await;

        // Start a new download (will resume from .part file)
        start_download(app, state, &download.model_id, &download.url).await?;

        info!("Download resumed: {}", download_id);
        Ok(())
    } else {
        Err("Download not found".to_string())
    }
}

/// Cancel a download and clean up partial files
pub async fn cancel_download(
    app: &AppHandle,
    state: &DownloadState,
    download_id: &str,
) -> Result<(), String> {
    if let Some(download) = state.remove_download(download_id).await {
        // Signal cancellation
        let _ = download.cancel_token.send(true);

        // Clean up partial file
        if download.part_path.exists() {
            if let Err(e) = std::fs::remove_file(&download.part_path) {
                warn!("Failed to remove partial file: {}", e);
            }
        }

        // Emit cancellation event
        let _ = app.emit(
            "download_progress",
            DownloadProgressEvent {
                download_id: download_id.to_string(),
                model_id: download.model_id,
                status: "cancelled".to_string(),
                bytes_downloaded: download.bytes_downloaded,
                total_bytes: download.total_bytes,
                speed_bps: 0,
                eta_seconds: 0,
            },
        );

        info!("Download cancelled: {}", download_id);
        Ok(())
    } else {
        Err("Download not found".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_progress_event_creation() {
        let (tx, _rx) = watch::channel(false);
        let download = Download {
            id: "test-123".to_string(),
            model_id: "phi-3-mini".to_string(),
            url: "https://example.com/model.gguf".to_string(),
            file_path: PathBuf::from("/tmp/model.gguf"),
            part_path: PathBuf::from("/tmp/model.gguf.part"),
            bytes_downloaded: 500_000_000,
            total_bytes: 2_500_000_000,
            status: DownloadStatus::Downloading,
            cancel_token: Arc::new(tx),
        };

        let event = download.to_progress_event(10_000_000, 200);

        assert_eq!(event.download_id, "test-123");
        assert_eq!(event.model_id, "phi-3-mini");
        assert_eq!(event.status, "downloading");
        assert_eq!(event.bytes_downloaded, 500_000_000);
        assert_eq!(event.speed_bps, 10_000_000);
    }

    #[test]
    fn test_download_status_variants() {
        let statuses = [
            DownloadStatus::Queued,
            DownloadStatus::Downloading,
            DownloadStatus::Paused,
            DownloadStatus::Completed,
            DownloadStatus::Failed,
            DownloadStatus::Cancelled,
        ];

        for status in statuses {
            // Should not panic
            let _ = format!("{:?}", status);
        }
    }
}
