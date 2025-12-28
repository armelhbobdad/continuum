//! Hardware detection module for system capability detection
//!
//! This module provides Tauri commands for:
//! - System RAM, CPU, and storage detection (AC1, AC3)
//! - GPU detection via nvidia-smi (AC2)
//! - Caching to avoid repeated system queries
//!
//! Story 2.1: Hardware Capability Detection
//! ADR-HARDWARE-002: Uses sysinfo crate for cross-platform detection

mod commands;
mod state;

pub use commands::*;
pub use state::*;
