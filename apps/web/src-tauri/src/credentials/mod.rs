//! Credential Bridge module (Story 5.1, 5.2)
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
//! - Three-tier storage: Keychain > Stronghold > Memory (Story 5.2)
//!
//! # Story References
//! - Story 5.1: Credential Bridge Foundation
//!   - AC1: Credentials stored in Rust backend
//!   - AC2: Opaque tokens via IPC
//!   - AC3: No credentials in web storage
//!   - AC4: Fast credential check on cold start
//! - Story 5.2: OS Keychain Integration
//!   - AC1-3: Platform-specific keychain backends
//!   - AC4: Stronghold fallback
//!   - AC5: Memory-only last resort
//!   - AC6: Storage tier indicator

pub mod backend;
pub mod bridge;
pub mod commands;
pub mod keychain;
pub mod memory;
pub mod offline;
pub mod refresh;
pub mod state;
pub mod storage;
pub mod stronghold;
pub mod types;

// Re-export commands with wildcard to include Tauri-generated __cmd__ symbols
#[allow(clippy::wildcard_imports)]
pub use commands::*;
pub use state::CredentialState;
// Re-export public types for IPC serialization (used by commands, serialized to JS)
#[allow(unused_imports)]
pub use types::{AuthState, CredentialError, CredentialStatus, OpaqueToken, TokenType, UserInfo};
// Re-export storage types for IPC (Story 5.2)
#[allow(unused_imports)]
pub use storage::{SecurityLevel, StorageInfo, StorageTier};
// Re-export offline types for IPC (Story 5.4)
#[allow(unused_imports)]
pub use offline::{
    DegradedMode, OfflineCredentialState, OfflineValidationResult, OfflineValidator,
    OFFLINE_VALIDITY_DAYS, READ_ONLY_GRACE_DAYS, SECONDS_PER_DAY,
};
// Re-export refresh types for IPC (Story 5.4)
#[allow(unused_imports)]
pub use refresh::{CredentialRefresher, RefreshResult};

#[cfg(test)]
mod tests;
