//! Credential Bridge module (Story 5.1)
//!
//! Provides secure credential storage in Rust backend with only opaque tokens
//! exposed to the WebView. All sensitive credentials (access tokens, refresh tokens,
//! API keys, OAuth secrets) remain in Rust memory and are NEVER returned to JavaScript.
//!
//! # Security Architecture
//!
//! - Credentials stored in thread-safe Mutex in Rust
//! - Frontend receives opaque tokens (hashed identifiers) only
//! - No raw credentials in localStorage, sessionStorage, or cookies
//! - Cold start credential check < 500ms (NFR-CRED-2)
//!
//! # Story References
//! - Story 5.1: Credential Bridge Foundation
//! - AC1: Credentials stored in Rust backend
//! - AC2: Opaque tokens via IPC
//! - AC3: No credentials in web storage
//! - AC4: Fast credential check on cold start

pub mod bridge;
pub mod commands;
pub mod state;
pub mod types;

// Re-export commands with wildcard to include Tauri-generated __cmd__ symbols
#[allow(clippy::wildcard_imports)]
pub use commands::*;
pub use state::CredentialState;
// Re-export public types for IPC serialization (used by commands, serialized to JS)
#[allow(unused_imports)]
pub use types::{AuthState, CredentialError, CredentialStatus, OpaqueToken, TokenType, UserInfo};

#[cfg(test)]
mod tests;
