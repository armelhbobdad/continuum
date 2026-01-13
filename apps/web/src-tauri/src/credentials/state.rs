//! Credential state management for Tauri (Story 5.1, 5.2, 5.5)
//!
//! Provides thread-safe credential state that can be managed by Tauri.
//!
//! # Performance Requirements
//! - NFR-CRED-2: Credential availability check must complete within 500ms on cold start
//!
//! # Story 5.2 Additions
//! - Storage-aware initialization with app_data_dir
//! - Automatic tier detection (Keychain > Stronghold > Memory)
//!
//! # Story 5.5 Additions
//! - MigrationManager for anonymous-to-authenticated migration

use super::bridge::CredentialBridge;
use super::migration::MigrationManager;
use super::types::{CredentialError, StoredCredentials};
use std::path::PathBuf;

/// Credential state managed by Tauri (AC1, AC4)
///
/// This struct wraps the CredentialBridge for Tauri's state management system.
/// It is initialized once at app startup and shared across all commands.
///
/// Story 5.2: Now supports storage-aware initialization with automatic
/// tier detection based on available backends.
///
/// Story 5.5: Includes MigrationManager for anonymous-to-authenticated migration.
pub struct CredentialState {
    /// The credential bridge for secure credential operations
    pub bridge: CredentialBridge,
    /// Migration manager for anonymous-to-authenticated migration (Story 5.5)
    pub migration: MigrationManager,
}

impl CredentialState {
    /// Create a new credential state with empty credentials (memory-only)
    ///
    /// Performance: This initialization is part of app startup
    /// and contributes to the cold start timing (NFR-CRED-2).
    ///
    /// Note: For production use, prefer `new_with_storage` to enable
    /// persistent credential storage.
    pub fn new() -> Self {
        Self {
            bridge: CredentialBridge::new(),
            migration: MigrationManager::new(),
        }
    }

    /// Create a new credential state with storage tier detection (Story 5.2)
    ///
    /// # Arguments
    ///
    /// * `app_data_dir` - Path to app data directory for vault storage
    ///
    /// This initializes the credential bridge with automatic storage tier
    /// detection: OS Keychain > Stronghold > Memory fallback.
    pub fn new_with_storage(app_data_dir: PathBuf) -> Self {
        Self {
            bridge: CredentialBridge::new_with_storage(Some(app_data_dir)),
            migration: MigrationManager::new(),
        }
    }

    /// Check if credentials are available (fast check) (AC4)
    ///
    /// This is a lightweight check that should complete quickly.
    /// Used during app initialization to determine auth state.
    ///
    /// # Performance
    /// Target: < 500ms on cold start (NFR-CRED-2)
    /// Note: Used in tests; command uses bridge.check_availability() directly
    #[allow(dead_code)]
    pub fn check_availability(&self) -> bool {
        self.bridge.check_availability()
    }

    /// Store OAuth tokens securely (Story 5.3 AC5)
    ///
    /// Stores the access and refresh tokens received from OAuth token exchange
    /// via the Credential Bridge.
    ///
    /// # Arguments
    ///
    /// * `access_token` - The access token from the OAuth provider
    /// * `refresh_token` - Optional refresh token
    /// * `expires_at` - Optional expiry timestamp (Unix seconds)
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Tokens stored successfully
    /// * `Err(CredentialError)` - If storage fails
    #[allow(clippy::unused_async)]
    pub async fn store_oauth_tokens(
        &self,
        access_token: String,
        refresh_token: Option<String>,
        expires_at: Option<i64>,
    ) -> Result<(), CredentialError> {
        let mut credentials = StoredCredentials::new(access_token);

        if let Some(rt) = refresh_token {
            credentials = credentials.with_refresh_token(rt);
        }

        if let Some(exp) = expires_at {
            credentials = credentials.with_expiry(exp);
        }

        self.bridge.store_credentials(credentials)
    }
}

impl Default for CredentialState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod state_tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_credential_state_creation() {
        let state = CredentialState::new();
        assert!(!state.bridge.check_availability());
    }

    #[test]
    fn test_credential_state_default() {
        let state = CredentialState::default();
        assert!(!state.check_availability());
    }

    #[test]
    fn test_cold_start_performance() {
        // NFR-CRED-2: Check must complete within 500ms
        let start = Instant::now();

        let state = CredentialState::new();
        let _available = state.check_availability();

        let elapsed = start.elapsed();

        // Allow generous margin for CI variability (50ms in practice)
        assert!(
            elapsed.as_millis() < 500,
            "Cold start check took {}ms, expected < 500ms",
            elapsed.as_millis()
        );
    }
}
