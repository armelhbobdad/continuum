//! Download manager for resumable model downloads
//!
//! Implements chunked downloads with HTTP Range headers for resume capability.
//! Uses .part files to track partial downloads.
//!
//! Story 2.3: Model Download Manager
//! Story 2.5: Model Integrity Verification
//! ADR-DOWNLOAD-002: Chunked downloads with resume capability
//! ADR-VERIFY-001: SHA-256 verification on download completion

use super::state::{Download, DownloadProgressEvent, DownloadState, DownloadStatus};
use crate::verification;
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

/// Threshold for emitting verification progress (500MB per Task 12)
const VERIFICATION_PROGRESS_THRESHOLD: u64 = 500 * 1024 * 1024;

/// Verify file integrity with progress events for large files (Task 12)
/// Emits verification:progress events for files larger than 500MB
fn verify_with_progress(
    app: &AppHandle,
    file_path: &PathBuf,
    expected_hash: &str,
    download_id: &str,
    model_id: &str,
    file_size: u64,
) -> Result<verification::VerificationResult, verification::VerificationError> {
    use sha2::{Digest, Sha256};
    use std::io::Read;

    // For small files, use simple verification (no progress needed)
    if file_size < VERIFICATION_PROGRESS_THRESHOLD {
        return verification::verify_integrity(file_path, expected_hash);
    }

    // For large files, use chunked reading with progress events
    let file = std::fs::File::open(file_path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            verification::VerificationError::file_not_found(file_path)
        } else {
            verification::VerificationError::io_error(file_path, &e)
        }
    })?;

    let mut reader = std::io::BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8 * 1024 * 1024]; // 8MB chunks
    let mut bytes_processed: u64 = 0;
    let mut last_progress_emit = std::time::Instant::now();

    loop {
        let bytes_read = reader.read(&mut buffer).map_err(|e| {
            verification::VerificationError::io_error(file_path, &e)
        })?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
        bytes_processed += bytes_read as u64;

        // Emit progress every 500ms
        if last_progress_emit.elapsed() >= Duration::from_millis(500) {
            let percent = (bytes_processed as f64 / file_size as f64 * 100.0) as u64;
            let _ = app.emit(
                "verification_progress",
                serde_json::json!({
                    "download_id": download_id,
                    "model_id": model_id,
                    "bytes_processed": bytes_processed,
                    "total_bytes": file_size,
                    "percent": percent,
                }),
            );
            last_progress_emit = std::time::Instant::now();
        }
    }

    let computed_hash = format!("{:x}", hasher.finalize());
    let expected_lower = expected_hash.to_lowercase();
    let verified = computed_hash == expected_lower;

    Ok(verification::VerificationResult {
        verified,
        computed_hash,
        expected_hash: expected_lower,
        file_size,
    })
}

/// Start a new download for model and tokenizer
///
/// Returns the download_id for tracking.
/// Downloads are stored as .part files until complete.
/// If expected_hash is provided, verification runs before finalizing (Story 2.5).
///
/// File structure:
/// ```
/// models/
///   {model_id}/
///     model.gguf       <- main model weights
///     tokenizer.json   <- tokenizer for the model
///     model.gguf.part  <- partial download (during download)
/// ```
pub async fn start_download(
    app: &AppHandle,
    state: &DownloadState,
    model_id: &str,
    url: &str,
    tokenizer_url: &str,
    expected_hash: Option<&str>,
) -> Result<String, String> {
    let download_id = Uuid::new_v4().to_string();
    let models_dir = state.models_dir();

    // Create model-specific directory
    let model_dir = models_dir.join(model_id);
    std::fs::create_dir_all(&model_dir)
        .map_err(|e| format!("Failed to create model directory: {}", e))?;

    // Download tokenizer first (small file, quick)
    download_tokenizer(state.client(), tokenizer_url, &model_dir).await?;

    // Determine file paths for model (inside model directory)
    let file_path = model_dir.join("model.gguf");
    let part_path = model_dir.join("model.gguf.part");

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
        tokenizer_url: tokenizer_url.to_string(),
        file_path: file_path.clone(),
        part_path: part_path.clone(),
        bytes_downloaded,
        total_bytes,
        status: DownloadStatus::Downloading,
        cancel_token: Arc::new(cancel_tx),
        expected_hash: expected_hash.map(|s| s.to_string()),
    };

    state.add_download(download).await;

    // Clone values for async task
    let app_handle = app.clone();
    let client = state.client().clone();
    let url = url.to_string();
    let model_id = model_id.to_string();
    let id = download_id.clone();
    let expected_hash = expected_hash.map(|s| s.to_string());
    let quarantine_dir = state.quarantine_dir();

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
            expected_hash.as_deref(),
            &quarantine_dir,
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

/// Download tokenizer.json to the model directory
async fn download_tokenizer(
    client: &reqwest::Client,
    url: &str,
    model_dir: &std::path::Path,
) -> Result<(), String> {
    let tokenizer_path = model_dir.join("tokenizer.json");

    // Skip if already downloaded
    if tokenizer_path.exists() {
        info!("Tokenizer already exists at {:?}", tokenizer_path);
        return Ok(());
    }

    info!("Downloading tokenizer from {}", url);

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Tokenizer download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Tokenizer download failed: HTTP {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read tokenizer: {}", e))?;

    std::fs::write(&tokenizer_path, &bytes)
        .map_err(|e| format!("Failed to save tokenizer: {}", e))?;

    info!("Tokenizer saved to {:?}", tokenizer_path);
    Ok(())
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

/// Download file with resume support and optional integrity verification (Story 2.5)
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
    expected_hash: Option<&str>,
    quarantine_dir: &std::path::Path,
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

    // Story 2.5: Checksum verification before rename
    if let Some(hash) = expected_hash {
        info!("Verifying integrity of downloaded file: {}", model_id);

        // Emit verifying status
        let _ = app.emit(
            "download_progress",
            DownloadProgressEvent {
                download_id: download_id.to_string(),
                model_id: model_id.to_string(),
                status: "verifying".to_string(),
                bytes_downloaded: total_bytes,
                total_bytes,
                speed_bps: 0,
                eta_seconds: 0,
            },
        );

        // Task 12: Use streaming verification with progress events for large files
        // Note: We emit progress via download_progress event with "verifying" status
        // and percentage in eta_seconds field (repurposed for verification progress)
        let verification_result = verify_with_progress(
            app,
            part_path,
            hash,
            download_id,
            model_id,
            total_bytes,
        );

        match verification_result {
            Ok(result) if result.verified => {
                info!(
                    "Checksum verified for {}: {}",
                    model_id, result.computed_hash
                );
            }
            Ok(result) => {
                // Verification failed - quarantine the file
                warn!(
                    "Checksum mismatch for {}: expected {}, got {}",
                    model_id, result.expected_hash, result.computed_hash
                );

                // Move to quarantine
                let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
                let quarantine_filename = format!("{}_{}.gguf.corrupted", model_id, timestamp);
                let quarantine_path = quarantine_dir.join(&quarantine_filename);

                std::fs::rename(part_path, &quarantine_path).map_err(|e| {
                    format!(
                        "Failed to quarantine corrupted file: {}. Source: {}, Dest: {}",
                        e,
                        part_path.display(),
                        quarantine_path.display()
                    )
                })?;

                // Emit corrupted event
                let _ = app.emit(
                    "download_progress",
                    DownloadProgressEvent {
                        download_id: download_id.to_string(),
                        model_id: model_id.to_string(),
                        status: "corrupted".to_string(),
                        bytes_downloaded: total_bytes,
                        total_bytes,
                        speed_bps: 0,
                        eta_seconds: 0,
                    },
                );

                // Also emit a detailed corruption event for the UI
                let _ = app.emit(
                    "download_corrupted",
                    serde_json::json!({
                        "model_id": model_id,
                        "expected_hash": result.expected_hash,
                        "actual_hash": result.computed_hash,
                        "quarantine_path": quarantine_path.to_string_lossy(),
                    }),
                );

                return Err(format!(
                    "Checksum verification failed: expected {}, got {}",
                    result.expected_hash, result.computed_hash
                ));
            }
            Err(e) => {
                error!("Verification error for {}: {:?}", model_id, e);
                return Err(format!("Verification failed: {}", e.message));
            }
        }
    }

    // Rename .part to final file
    std::fs::rename(part_path, final_path)
        .map_err(|e| format!("Rename failed: {}", e))?;

    info!("Download completed: {}", model_id);

    // Emit completion event with verified status if hash was checked
    let status = if expected_hash.is_some() {
        "verified"
    } else {
        "completed"
    };

    let _ = app.emit(
        "download_progress",
        DownloadProgressEvent {
            download_id: download_id.to_string(),
            model_id: model_id.to_string(),
            status: status.to_string(),
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
        // Tokenizer should already be downloaded since it downloads first
        // Story 2.5: Pass stored expected_hash for verification on resume
        start_download(
            app,
            state,
            &download.model_id,
            &download.url,
            &download.tokenizer_url,
            download.expected_hash.as_deref(),
        )
        .await?;

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
            tokenizer_url: "https://example.com/tokenizer.json".to_string(),
            file_path: PathBuf::from("/tmp/model.gguf"),
            part_path: PathBuf::from("/tmp/model.gguf.part"),
            bytes_downloaded: 500_000_000,
            total_bytes: 2_500_000_000,
            status: DownloadStatus::Downloading,
            cancel_token: Arc::new(tx),
            expected_hash: Some("abc123".to_string()),
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
