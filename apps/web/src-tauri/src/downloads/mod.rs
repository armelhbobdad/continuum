//! Download manager module for model file downloads
//!
//! This module provides Tauri commands for:
//! - Starting/pausing/resuming/cancelling downloads (AC2)
//! - Progress tracking via Tauri events (AC1)
//! - Resumable downloads with HTTP Range headers (AC4)
//! - Storage space validation (AC5)
//!
//! Story 2.3: Model Download Manager
//! ADR-DOWNLOAD-002: Chunked downloads with resume capability
//! ADR-DOWNLOAD-003: Tauri event system for progress updates

mod commands;
mod manager;
mod state;

pub use commands::*;
pub use state::*;
