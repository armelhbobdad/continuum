//! Model integrity verification module (Story 2.5)
//!
//! Provides SHA-256 checksum computation and verification for downloaded models.
//! Uses streaming approach for memory-efficient hashing of large files (2-10GB).

// Large buffers are intentional for I/O performance on multi-GB model files
#![allow(clippy::large_stack_arrays)]
#![allow(clippy::large_stack_frames)]
// Progress percentages don't need full f64 precision
#![allow(clippy::cast_precision_loss)]

pub mod commands;

use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;
use tauri::ipc::Channel;

/// Result of a file integrity verification
#[derive(Debug, Clone, serde::Serialize)]
pub struct VerificationResult {
    pub verified: bool,
    pub computed_hash: String,
    pub expected_hash: String,
    pub file_size: u64,
}

/// Error types for verification operations
#[derive(Debug, Clone, serde::Serialize)]
pub struct VerificationError {
    pub kind: String,
    pub message: String,
}

impl VerificationError {
    pub fn file_not_found(path: &Path) -> Self {
        Self {
            kind: "file_not_found".to_string(),
            message: format!("File not found: {}", path.display()),
        }
    }

    pub fn permission_denied(path: &Path) -> Self {
        Self {
            kind: "permission_denied".to_string(),
            message: format!("Permission denied: {}", path.display()),
        }
    }

    pub fn io_error(path: &Path, error: &io::Error) -> Self {
        Self {
            kind: "io_error".to_string(),
            message: format!("IO error reading {}: {}", path.display(), error),
        }
    }

    pub fn from_io_error(error: &io::Error, path: &Path) -> Self {
        match error.kind() {
            io::ErrorKind::NotFound => Self::file_not_found(path),
            io::ErrorKind::PermissionDenied => Self::permission_denied(path),
            _ => Self::io_error(path, error),
        }
    }
}

/// Progress event for large file hashing
#[derive(Debug, Clone, serde::Serialize)]
pub struct VerificationProgress {
    pub bytes_processed: u64,
    pub total_bytes: u64,
    pub percentage: f32,
}

/// Compute SHA-256 checksum of a file using streaming (constant memory)
///
/// # Arguments
/// * `path` - Path to the file to hash
///
/// # Returns
/// * `Ok(String)` - Lowercase hex-encoded SHA-256 hash
/// * `Err(VerificationError)` - Error with clear message
pub fn compute_checksum(path: &Path) -> Result<String, VerificationError> {
    let mut file = File::open(path).map_err(|e| VerificationError::from_io_error(&e, path))?;

    let mut hasher = Sha256::new();
    io::copy(&mut file, &mut hasher).map_err(|e| VerificationError::from_io_error(&e, path))?;

    let hash = hasher.finalize();
    Ok(format!("{hash:x}")) // lowercase hex
}

/// Compute SHA-256 checksum with progress reporting for large files
///
/// # Arguments
/// * `path` - Path to the file to hash
/// * `progress_channel` - Optional channel for progress events
///
/// # Returns
/// * `Ok(String)` - Lowercase hex-encoded SHA-256 hash
/// * `Err(VerificationError)` - Error with clear message
pub fn compute_checksum_with_progress(
    path: &Path,
    progress_channel: Option<&Channel<VerificationProgress>>,
) -> Result<String, VerificationError> {
    let file = File::open(path).map_err(|e| VerificationError::from_io_error(&e, path))?;
    let total_bytes = file
        .metadata()
        .map_err(|e| VerificationError::from_io_error(&e, path))?
        .len();

    let mut reader = io::BufReader::with_capacity(8 * 1024 * 1024, file); // 8MB buffer
    let mut hasher = Sha256::new();
    let mut bytes_processed: u64 = 0;
    let mut buffer = [0u8; 8 * 1024 * 1024]; // 8MB chunks

    // Only report progress for files >500MB
    let should_report_progress = total_bytes > 500 * 1024 * 1024;
    let mut last_percentage: f32 = 0.0;

    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .map_err(|e| VerificationError::from_io_error(&e, path))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
        bytes_processed += bytes_read as u64;

        // Report progress every 5% for large files
        if should_report_progress {
            let percentage = (bytes_processed as f32 / total_bytes as f32) * 100.0;
            if percentage - last_percentage >= 5.0 {
                if let Some(channel) = progress_channel {
                    let _ = channel.send(VerificationProgress {
                        bytes_processed,
                        total_bytes,
                        percentage,
                    });
                }
                last_percentage = percentage;
            }
        }
    }

    let hash = hasher.finalize();
    Ok(format!("{hash:x}"))
}

/// Verify file integrity against expected hash
///
/// # Arguments
/// * `path` - Path to the file to verify
/// * `expected_hash` - Expected SHA-256 hash (hex string)
///
/// # Returns
/// * `Ok(VerificationResult)` - Result with verification status and hashes
/// * `Err(VerificationError)` - Error with clear message
pub fn verify_integrity(
    path: &Path,
    expected_hash: &str,
) -> Result<VerificationResult, VerificationError> {
    let file_size = std::fs::metadata(path)
        .map_err(|e| VerificationError::from_io_error(&e, path))?
        .len();

    let computed_hash = compute_checksum(path)?;
    let expected_lower = expected_hash.to_lowercase();
    let verified = computed_hash == expected_lower;

    Ok(VerificationResult {
        verified,
        computed_hash,
        expected_hash: expected_lower,
        file_size,
    })
}

/// Verify file integrity with progress reporting
pub fn verify_integrity_with_progress(
    path: &Path,
    expected_hash: &str,
    progress_channel: Option<&Channel<VerificationProgress>>,
) -> Result<VerificationResult, VerificationError> {
    let file_size = std::fs::metadata(path)
        .map_err(|e| VerificationError::from_io_error(&e, path))?
        .len();

    let computed_hash = compute_checksum_with_progress(path, progress_channel)?;
    let expected_lower = expected_hash.to_lowercase();
    let verified = computed_hash == expected_lower;

    Ok(VerificationResult {
        verified,
        computed_hash,
        expected_hash: expected_lower,
        file_size,
    })
}

#[cfg(test)]
mod tests;
