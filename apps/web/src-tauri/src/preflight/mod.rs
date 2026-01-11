//! Pre-flight readiness check commands (Story 4.3)
//!
//! Provides commands for checking system readiness before enabling airplane mode.
//! These commands return data in formats expected by the TypeScript preflight checks.

mod commands;

pub use commands::*;
