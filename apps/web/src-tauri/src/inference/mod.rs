//! Inference module for local AI inference using Kalosm
//!
//! This module provides Tauri commands for:
//! - Loading/unloading models (AC3: cold model loading)
//! - Streaming text generation (AC2: warm latency, AC5: generation rate)
//! - Aborting generation (AC4: inference abort)
//! - Error handling with user-friendly messages (AC6)

mod commands;
mod state;

pub use commands::*;
pub use state::*;
