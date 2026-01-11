//! Tauri commands for pre-flight readiness checks
//!
//! Story 4.3: Pre-Flight Readiness Checklist
//! AC1-4: Check model, storage, RAM, and GPU status before offline mode
//!
//! These commands return data in the exact format expected by the TypeScript
//! preflight checks in apps/web/src/lib/preflight/checks.ts

// Tauri-specific patterns that clippy flags but are correct
#![allow(clippy::needless_pass_by_value)] // Tauri State is designed to be passed by value
#![allow(clippy::unnecessary_wraps)]
// Tauri commands require Result return type
// Storage sizes displayed in GB don't need full f64 precision
#![allow(clippy::cast_precision_loss)]

use crate::downloads::DownloadState;
use crate::hardware::HardwareState;
use serde::Serialize;
use sysinfo::{Disks, System};
use tauri::State;

/// Response for check_model_ready command
#[derive(Debug, Clone, Serialize)]
pub struct ModelReadyResponse {
    pub ready: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    pub verified: bool,
}

/// Response for check_storage_space command (preflight version)
#[derive(Debug, Clone, Serialize)]
pub struct StorageSpaceResponse {
    pub available_gb: f64,
}

/// Response for check_ram_availability command
#[derive(Debug, Clone, Serialize)]
pub struct RamAvailabilityResponse {
    pub available_gb: f64,
    pub required_gb: f64,
}

/// Response for check_gpu_capability command
#[derive(Debug, Clone, Serialize)]
pub struct GpuCapabilityResponse {
    pub has_gpu: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vram_gb: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cuda_available: Option<bool>,
}

/// Check if a local model is downloaded and ready for offline use
///
/// Scans the models directory to find any downloaded model.
/// Returns the first verified model found, or indicates no model is available.
///
/// # Returns
/// - `ready`: true if at least one model is downloaded
/// - `model`: name of the first model found (if any)
/// - `verified`: true if model file exists and is complete
#[tauri::command]
pub fn check_model_ready(state: State<'_, DownloadState>) -> Result<ModelReadyResponse, String> {
    let models_dir = state.models_dir();

    // Check if models directory exists
    if !models_dir.exists() {
        return Ok(ModelReadyResponse {
            ready: false,
            model: None,
            verified: false,
        });
    }

    // Scan for any downloaded model
    let entries = std::fs::read_dir(models_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let model_file = path.join("model.gguf");
            let tokenizer_file = path.join("tokenizer.json");

            // Model is ready if both model.gguf and tokenizer.json exist
            if model_file.exists() && tokenizer_file.exists() {
                let model_name = entry.file_name().to_str().unwrap_or("Unknown").to_string();

                // Check if there's a .part file (incomplete download)
                let part_file = path.join("model.gguf.part");
                let verified = !part_file.exists();

                return Ok(ModelReadyResponse {
                    ready: true,
                    model: Some(model_name),
                    verified,
                });
            }
        }
    }

    // No complete model found
    Ok(ModelReadyResponse {
        ready: false,
        model: None,
        verified: false,
    })
}

/// Check available storage space for offline operation
///
/// Returns total available disk space across all mounted drives.
/// This is the preflight-specific version that returns GB without requiring params.
///
/// # Returns
/// - `available_gb`: Available storage space in gigabytes
#[tauri::command]
pub fn preflight_storage_check() -> Result<StorageSpaceResponse, String> {
    let disks = Disks::new_with_refreshed_list();
    let available_bytes: u64 = disks.iter().map(sysinfo::Disk::available_space).sum();

    // Convert bytes to GB (1024^3)
    let available_gb = available_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

    Ok(StorageSpaceResponse { available_gb })
}

/// Check available RAM for model inference
///
/// Returns system memory information to determine if enough RAM
/// is available for the currently selected model.
///
/// # Returns
/// - `available_gb`: Available system RAM in gigabytes
/// - `required_gb`: Estimated RAM needed (based on typical model requirements)
#[tauri::command]
pub fn check_ram_availability(
    hardware_state: State<'_, HardwareState>,
) -> Result<RamAvailabilityResponse, String> {
    // Check cache first
    if let Some(cached) = hardware_state.get_cached_system() {
        let available_gb = cached.ram_mb as f64 / 1024.0;
        // Default required: 4GB for typical small models, 8GB for larger ones
        let required_gb = 4.0;

        return Ok(RamAvailabilityResponse {
            available_gb,
            required_gb,
        });
    }

    // Query system info
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get available (free + cached) memory, not total memory
    let available_bytes = sys.available_memory();
    let available_gb = available_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

    // Default required: 4GB for typical small models
    let required_gb = 4.0;

    Ok(RamAvailabilityResponse {
        available_gb,
        required_gb,
    })
}

/// Check GPU/VRAM capability for model inference
///
/// Detects NVIDIA GPU via nvidia-smi and reports VRAM availability.
/// Falls back to CPU inference messaging if no GPU detected.
///
/// # Returns
/// - `has_gpu`: true if a dedicated GPU is detected
/// - `vram_gb`: VRAM in gigabytes (if GPU detected)
/// - `name`: GPU model name (if detected)
/// - `cuda_available`: true if CUDA is available for acceleration
#[tauri::command]
pub fn check_gpu_capability(
    hardware_state: State<'_, HardwareState>,
) -> Result<GpuCapabilityResponse, String> {
    // Check cache first
    if let Some(cached) = hardware_state.get_cached_gpu() {
        return match cached {
            Some(gpu_info) => Ok(GpuCapabilityResponse {
                has_gpu: true,
                vram_gb: Some(gpu_info.vram_mb as f64 / 1024.0),
                name: Some(gpu_info.name),
                cuda_available: Some(gpu_info.compute_capable),
            }),
            None => Ok(GpuCapabilityResponse {
                has_gpu: false,
                vram_gb: None,
                name: None,
                cuda_available: None,
            }),
        };
    }

    // Try nvidia-smi for NVIDIA GPUs
    let output = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,memory.total",
            "--format=csv,noheader,nounits",
        ])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let line = stdout.trim();

            if line.is_empty() {
                return Ok(GpuCapabilityResponse {
                    has_gpu: false,
                    vram_gb: None,
                    name: None,
                    cuda_available: None,
                });
            }

            // Parse "GPU Name, VRAM" format
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                let name = parts[0].trim().to_string();
                let vram_mb: f64 = parts[1].trim().parse().unwrap_or(0.0);
                let vram_gb = vram_mb / 1024.0;

                Ok(GpuCapabilityResponse {
                    has_gpu: true,
                    vram_gb: Some(vram_gb),
                    name: Some(name),
                    cuda_available: Some(true), // NVIDIA = CUDA capable
                })
            } else {
                Ok(GpuCapabilityResponse {
                    has_gpu: false,
                    vram_gb: None,
                    name: None,
                    cuda_available: None,
                })
            }
        },
        _ => {
            // nvidia-smi not available or failed
            Ok(GpuCapabilityResponse {
                has_gpu: false,
                vram_gb: None,
                name: None,
                cuda_available: None,
            })
        },
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)] // Tests use unwrap for clarity
mod tests {
    use super::*;

    #[test]
    fn test_storage_space_returns_positive_value() {
        let result = preflight_storage_check().unwrap();
        assert!(result.available_gb > 0.0, "Storage should be positive");
    }

    // Note: check_gpu_capability and check_ram_availability require Tauri State
    // which can't be easily mocked in unit tests. These are tested via
    // integration tests when the app runs.
}
