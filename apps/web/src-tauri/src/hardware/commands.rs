//! Tauri commands for hardware detection
//!
//! Story 2.1: Hardware Capability Detection
//! AC1: RAM Detection on Desktop
//! AC2: GPU Detection on Desktop
//! AC3: Storage Detection
//!
//! ADR-HARDWARE-002: Uses sysinfo 0.31+ crate for cross-platform detection

use super::state::{GpuInfo, HardwareState, SystemInfo};
use log::warn;
use sysinfo::{Disks, System};
use tauri::State;

/// Get system RAM, CPU, and storage info
///
/// Uses sysinfo 0.31+ crate for cross-platform detection.
/// Results are cached to avoid re-querying every call.
///
/// # Returns
/// - `ram_mb`: Total system RAM in megabytes
/// - `cpu_cores`: Number of CPU cores
/// - `storage_available_mb`: Total available storage across all disks in megabytes
#[tauri::command]
#[allow(clippy::needless_pass_by_value)] // Tauri State is designed to be passed by value
#[allow(clippy::unnecessary_wraps)] // Tauri commands require Result return type
pub fn get_system_info(state: State<'_, HardwareState>) -> Result<SystemInfo, String> {
    // Check cache first
    if let Some(cached) = state.get_cached_system() {
        return Ok(cached);
    }

    // Query system info
    let mut sys = System::new_all();
    sys.refresh_all();

    // sysinfo 0.31+: total_memory() returns bytes, no trait import needed
    let ram_mb = sys.total_memory() / 1024 / 1024;
    let cpu_cores = sys.cpus().len();

    // sysinfo 0.31+: Use Disks struct directly (DiskExt deprecated)
    let disks = Disks::new_with_refreshed_list();
    let storage_available_mb: u64 = disks
        .iter()
        .map(|d| d.available_space() / 1024 / 1024)
        .sum();

    let info = SystemInfo {
        ram_mb,
        cpu_cores,
        storage_available_mb,
    };

    // Cache the result
    state.cache_system(info.clone());

    Ok(info)
}

/// Get GPU info via nvidia-smi (NVIDIA) or fallback
///
/// Returns None if no compatible GPU detected.
/// Caches the result (including None) to avoid repeated nvidia-smi calls.
///
/// # Returns
/// - `Some(GpuInfo)`: GPU name, VRAM in MB, and compute capability
/// - `None`: No GPU detected or nvidia-smi not available
#[tauri::command]
#[allow(clippy::needless_pass_by_value)] // Tauri State is designed to be passed by value
#[allow(clippy::unnecessary_wraps)] // Tauri commands require Result return type
pub fn get_gpu_info(state: State<'_, HardwareState>) -> Result<Option<GpuInfo>, String> {
    // Check cache first
    if let Some(cached) = state.get_cached_gpu() {
        return Ok(cached);
    }

    // Try nvidia-smi for NVIDIA GPUs
    let gpu_info = detect_nvidia_gpu();

    // Cache the result (including None)
    state.cache_gpu(gpu_info.clone());

    Ok(gpu_info)
}

/// Detect NVIDIA GPU via nvidia-smi command
///
/// Returns None if:
/// - nvidia-smi is not installed
/// - Command fails to execute
/// - No NVIDIA GPU detected
fn detect_nvidia_gpu() -> Option<GpuInfo> {
    let output = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,memory.total",
            "--format=csv,noheader,nounits",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.trim();

    if line.is_empty() {
        return None;
    }

    // Parse "GPU Name, VRAM" format
    // e.g., "NVIDIA GeForce RTX 4090, 24576"
    let parts: Vec<&str> = line.split(',').collect();
    if parts.len() < 2 {
        warn!("nvidia-smi output malformed: expected 'name,vram' but got: {line}");
        return None;
    }

    let name = parts[0].trim().to_string();
    let vram_mb: u64 = match parts[1].trim().parse() {
        Ok(v) => v,
        Err(e) => {
            warn!(
                "nvidia-smi VRAM parse failed for '{}': {} - using 0",
                parts[1].trim(),
                e
            );
            0
        },
    };

    Some(GpuInfo {
        name,
        vram_mb,
        compute_capable: true, // NVIDIA = CUDA capable
    })
}

#[cfg(test)]
#[allow(clippy::unwrap_used)] // Tests use unwrap for clarity
mod tests {
    use super::*;

    #[test]
    fn test_sysinfo_returns_valid_values() {
        // Test sysinfo crate directly (command wrapper tested via integration tests)
        let mut sys = System::new_all();
        sys.refresh_all();

        let ram_mb = sys.total_memory() / 1024 / 1024;
        let cpu_cores = sys.cpus().len();

        assert!(ram_mb > 0, "RAM should be positive");
        assert!(cpu_cores > 0, "CPU cores should be positive");
    }

    #[test]
    fn test_nvidia_gpu_detection_does_not_panic() {
        // Should not panic even if nvidia-smi is not available
        let result = detect_nvidia_gpu();
        // Result can be Some or None depending on system - just verify no panic
        let _ = result;
    }

    #[test]
    fn test_hardware_state_caching() {
        let state = HardwareState::new();

        // Initially cache should be empty
        assert!(state.get_cached_system().is_none());

        // Cache a value
        let info = SystemInfo {
            ram_mb: 16384,
            cpu_cores: 8,
            storage_available_mb: 512_000,
        };
        state.cache_system(info);

        // Cache should now be populated
        let cached = state.get_cached_system();
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().ram_mb, 16384);
    }

    #[test]
    fn test_gpu_cache_stores_none() {
        let state = HardwareState::new();

        // Cache None (no GPU)
        state.cache_gpu(None);

        // Should retrieve Some(None) - cache hit with no GPU
        let cached = state.get_cached_gpu();
        assert!(cached.is_some());
        assert!(cached.unwrap().is_none());
    }
}
