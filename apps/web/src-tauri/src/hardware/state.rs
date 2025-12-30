//! Hardware state management with caching
//!
//! Caches hardware detection results to avoid re-querying every call.
//! Story 2.1: Hardware Capability Detection

// Option<Option<T>> is intentional: outer Option = cache miss, inner Option = no GPU detected
#![allow(clippy::option_option)]

use log::warn;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// System information from sysinfo crate
#[derive(Clone, Serialize)]
pub struct SystemInfo {
    pub ram_mb: u64,
    pub cpu_cores: usize,
    pub storage_available_mb: u64,
}

/// GPU information (NVIDIA via nvidia-smi)
#[derive(Clone, Serialize)]
pub struct GpuInfo {
    pub name: String,
    pub vram_mb: u64,
    pub compute_capable: bool,
}

/// Cache duration for hardware info (30 seconds)
/// Lower than polling interval (60s) to ensure fresh data on demand
const CACHE_DURATION: Duration = Duration::from_secs(30);

/// Cached hardware information
struct CachedInfo<T> {
    data: Option<T>,
    timestamp: Option<Instant>,
}

impl<T> CachedInfo<T> {
    const fn new() -> Self {
        Self {
            data: None,
            timestamp: None,
        }
    }

    fn is_valid(&self) -> bool {
        self.timestamp.is_some_and(|t| t.elapsed() < CACHE_DURATION)
    }

    fn set(&mut self, data: T) {
        self.data = Some(data);
        self.timestamp = Some(Instant::now());
    }
}

impl<T: Clone> CachedInfo<T> {
    fn get(&self) -> Option<T> {
        if self.is_valid() {
            self.data.clone()
        } else {
            None
        }
    }
}

/// Hardware state for caching detection results
pub struct HardwareState {
    system_cache: Mutex<CachedInfo<SystemInfo>>,
    gpu_cache: Mutex<CachedInfo<Option<GpuInfo>>>,
}

impl HardwareState {
    pub const fn new() -> Self {
        Self {
            system_cache: Mutex::new(CachedInfo::new()),
            gpu_cache: Mutex::new(CachedInfo::new()),
        }
    }

    /// Get cached system info or return None if cache expired
    pub fn get_cached_system(&self) -> Option<SystemInfo> {
        match self.system_cache.lock() {
            Ok(cache) => cache.get(),
            Err(e) => {
                warn!("Hardware cache mutex poisoned (system): {e}");
                None
            },
        }
    }

    /// Cache system info
    pub fn cache_system(&self, info: SystemInfo) {
        match self.system_cache.lock() {
            Ok(mut cache) => cache.set(info),
            Err(e) => warn!("Hardware cache mutex poisoned (system write): {e}"),
        }
    }

    /// Get cached GPU info or return None if cache expired
    pub fn get_cached_gpu(&self) -> Option<Option<GpuInfo>> {
        match self.gpu_cache.lock() {
            Ok(cache) => cache.get(),
            Err(e) => {
                warn!("Hardware cache mutex poisoned (gpu): {e}");
                None
            },
        }
    }

    /// Cache GPU info (including None for no GPU)
    pub fn cache_gpu(&self, info: Option<GpuInfo>) {
        match self.gpu_cache.lock() {
            Ok(mut cache) => cache.set(info),
            Err(e) => warn!("Hardware cache mutex poisoned (gpu write): {e}"),
        }
    }
}

impl Default for HardwareState {
    fn default() -> Self {
        Self::new()
    }
}
