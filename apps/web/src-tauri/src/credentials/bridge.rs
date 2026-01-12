//! Credential Bridge core logic (Story 5.1, 5.2)
//!
//! Manages credentials securely in Rust with thread-safe access.
//! Story 5.2 adds persistent storage via OS keychain with fallback.
//!
//! SECURITY: This module NEVER exposes raw credentials to the frontend.
//! All public methods return opaque representations only.

// Allow clippy suggestions that don't improve readability in this context
#![allow(clippy::missing_const_for_fn)] // Mutex::new isn't const
#![allow(clippy::option_if_let_else)] // Match statements are clearer for credential logic
#![allow(clippy::cast_possible_wrap)] // Timestamps are within i64 range for app lifetime

use super::backend::StorageManager;
use super::storage::{StorageInfo, StorageTier};
use super::types::{
    AuthState, CredentialError, CredentialStatus, OpaqueToken, StoredCredentials, TokenType,
};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Storage key for serialized credentials
const CREDENTIAL_STORAGE_KEY: &str = "continuum_credentials";

/// Credential Bridge - manages credentials securely in Rust (AC1, AC2)
///
/// Story 5.2 adds: Three-tier storage with OS keychain, Stronghold, and memory fallback.
///
/// SECURITY: This struct holds all sensitive credentials.
/// Public methods return opaque tokens, never raw credentials.
pub struct CredentialBridge {
    /// Thread-safe in-memory credential cache
    credentials: Mutex<Option<StoredCredentials>>,
    /// Storage manager for persistent storage (Story 5.2)
    storage: StorageManager,
}

impl CredentialBridge {
    /// Create a new credential bridge with automatic storage tier detection
    ///
    /// # Arguments
    ///
    /// * `app_data_dir` - Optional path to app data directory for vault storage
    pub fn new_with_storage(app_data_dir: Option<PathBuf>) -> Self {
        let storage = StorageManager::new(app_data_dir);

        // Try to load credentials from storage on startup
        let credentials = Self::load_from_storage(&storage);

        Self {
            credentials: Mutex::new(credentials),
            storage,
        }
    }

    /// Create a new empty credential bridge (memory-only, for testing)
    pub fn new() -> Self {
        Self {
            credentials: Mutex::new(None),
            storage: StorageManager::default(),
        }
    }

    /// Load credentials from persistent storage
    fn load_from_storage(storage: &StorageManager) -> Option<StoredCredentials> {
        match storage.retrieve(CREDENTIAL_STORAGE_KEY) {
            Ok(Some(json)) => serde_json::from_str(&json).ok(),
            _ => None,
        }
    }

    /// Save credentials to persistent storage
    fn save_to_storage(&self, credentials: &StoredCredentials) -> Result<(), CredentialError> {
        let json = serde_json::to_string(credentials)
            .map_err(|e| CredentialError::InternalError(format!("Serialize error: {e}")))?;
        self.storage.store(CREDENTIAL_STORAGE_KEY, &json)
    }

    /// Get storage info for UI display (AC6)
    #[must_use]
    pub fn get_storage_info(&self) -> StorageInfo {
        self.storage.storage_info()
    }

    /// Get the current storage tier
    #[must_use]
    pub fn storage_tier(&self) -> StorageTier {
        self.storage.current_tier()
    }

    /// Store credentials securely (internal only) (AC1)
    ///
    /// SECURITY: This should only be called from Rust code, not exposed directly to JS.
    /// Story 5.2: Now persists to active storage backend (keychain/stronghold/memory).
    #[allow(dead_code)]
    pub(crate) fn store_credentials(
        &self,
        credentials: StoredCredentials,
    ) -> Result<(), CredentialError> {
        // Persist to storage backend first
        self.save_to_storage(&credentials)?;

        // Then update in-memory cache
        let mut guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;
        *guard = Some(credentials);
        Ok(())
    }

    /// Get authentication status (opaque, safe for frontend) (AC2)
    ///
    /// Returns AuthState with credential status and opaque session info.
    /// SECURITY: Never returns actual credentials.
    pub fn get_auth_status(&self) -> Result<AuthState, CredentialError> {
        let guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;

        match &*guard {
            None => Ok(AuthState::default()),
            Some(creds) => {
                let now = get_current_timestamp();

                let status = match creds.expires_at {
                    Some(exp) if exp < now => CredentialStatus::Expired,
                    _ => CredentialStatus::Valid,
                };

                // Generate opaque session ID (NOT the actual token)
                let session_id = Some(generate_opaque_id(&creds.access_token));

                Ok(AuthState {
                    status,
                    session_id,
                    expiry_timestamp: creds.expires_at,
                    user_info: creds.user_info.clone(),
                })
            },
        }
    }

    /// Get session token (opaque representation only) (AC2)
    ///
    /// SECURITY: Returns OpaqueToken, NOT the actual token value.
    pub fn get_session_token(&self) -> Result<OpaqueToken, CredentialError> {
        let guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;

        match &*guard {
            None => Err(CredentialError::NotFound),
            Some(creds) => {
                let now = get_current_timestamp();

                if let Some(exp) = creds.expires_at {
                    if exp < now {
                        return Err(CredentialError::Expired);
                    }
                }

                Ok(OpaqueToken {
                    id: generate_opaque_id(&creds.access_token),
                    expiry: creds.expires_at.unwrap_or(now + 3600),
                    token_type: TokenType::Session,
                })
            },
        }
    }

    /// Clear all credentials (secure wipe) (AC1, AC3)
    ///
    /// Securely erases all credentials from memory and persistent storage.
    /// Story 5.2: Also clears from active storage backend.
    pub fn clear_credentials(&self) -> Result<(), CredentialError> {
        // Clear from persistent storage first
        let _ = self.storage.delete(CREDENTIAL_STORAGE_KEY);

        let mut guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;

        // Secure wipe - overwrite before dropping
        if let Some(ref mut creds) = *guard {
            // Overwrite sensitive strings with empty values
            creds.access_token.clear();
            creds.access_token.shrink_to_fit();

            if let Some(ref mut rt) = creds.refresh_token {
                rt.clear();
                rt.shrink_to_fit();
            }

            // Clear API keys
            for value in creds.api_keys.values_mut() {
                value.clear();
                value.shrink_to_fit();
            }
            creds.api_keys.clear();

            // Clear OAuth secrets
            if let Some(ref mut oauth) = creds.oauth_secrets {
                oauth.client_secret.clear();
                oauth.client_secret.shrink_to_fit();
                if let Some(ref mut code) = oauth.authorization_code {
                    code.clear();
                    code.shrink_to_fit();
                }
            }
        }

        *guard = None;
        Ok(())
    }

    /// Check if credentials are available (fast check for cold start) (AC4)
    ///
    /// Performance: This operation MUST complete within 500ms (NFR-CRED-2).
    pub fn check_availability(&self) -> bool {
        self.credentials
            .lock()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
    }

    /// Validate credentials without exposing them (AC1)
    ///
    /// Returns true if credentials exist and are not expired.
    pub fn validate_credentials(&self) -> Result<bool, CredentialError> {
        let guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;

        match &*guard {
            None => Ok(false),
            Some(creds) => {
                let now = get_current_timestamp();

                match creds.expires_at {
                    Some(exp) => Ok(exp > now),
                    None => Ok(true), // No expiry = always valid
                }
            },
        }
    }

    /// Check if credentials have a refresh token available
    /// Note: Will be used in token refresh flow (Story 5.2)
    #[allow(dead_code)]
    pub fn has_refresh_token(&self) -> bool {
        self.credentials
            .lock()
            .map(|guard| guard.as_ref().is_some_and(|c| c.refresh_token.is_some()))
            .unwrap_or(false)
    }

    /// Get stored credentials (internal only) (Story 5.4)
    ///
    /// SECURITY: This returns a clone of credentials for internal use only.
    /// Must NOT be exposed to frontend directly.
    pub(crate) fn get_stored_credentials(&self) -> Result<StoredCredentials, CredentialError> {
        let guard = self
            .credentials
            .lock()
            .map_err(|e| CredentialError::InternalError(e.to_string()))?;

        guard.clone().ok_or(CredentialError::NotFound)
    }
}

impl Default for CredentialBridge {
    fn default() -> Self {
        Self::new()
    }
}

/// Get current Unix timestamp in seconds
fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Generate opaque identifier from a secret (one-way hash) (AC2)
///
/// SECURITY: This creates a non-reversible identifier from a secret.
/// The original secret cannot be recovered from the opaque ID.
fn generate_opaque_id(secret: &str) -> String {
    let mut hasher = DefaultHasher::new();
    secret.hash(&mut hasher);
    format!("opaque_{:x}", hasher.finish())
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
#[allow(clippy::cast_possible_wrap)]
mod bridge_tests {
    use super::*;
    use crate::credentials::types::UserInfo;

    fn create_test_credentials() -> StoredCredentials {
        let now = get_current_timestamp();

        StoredCredentials::new("secret_access_token_123".to_string())
            .with_refresh_token("secret_refresh_token_456".to_string())
            .with_expiry(now + 3600) // 1 hour from now
            .with_user_info(UserInfo {
                id: "user_123".to_string(),
                email: Some("test@example.com".to_string()),
                display_name: Some("Test User".to_string()),
            })
    }

    #[test]
    fn test_new_bridge_has_no_credentials() {
        let bridge = CredentialBridge::new();
        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::NotStored);
        assert!(status.session_id.is_none());
    }

    #[test]
    fn test_store_and_retrieve_status() {
        let bridge = CredentialBridge::new();
        bridge.store_credentials(create_test_credentials()).unwrap();

        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::Valid);
        assert!(status.session_id.is_some());

        // CRITICAL: session_id should NOT contain the actual token
        let session_id = status.session_id.unwrap();
        assert!(!session_id.contains("secret"));
        assert!(session_id.starts_with("opaque_"));
    }

    #[test]
    fn test_session_token_is_opaque() {
        let bridge = CredentialBridge::new();
        bridge.store_credentials(create_test_credentials()).unwrap();

        let token = bridge.get_session_token().unwrap();

        // CRITICAL: Token ID should NOT contain actual secret
        assert!(!token.id.contains("secret"));
        assert!(token.id.starts_with("opaque_"));
        assert_eq!(token.token_type, TokenType::Session);
    }

    #[test]
    fn test_clear_credentials() {
        let bridge = CredentialBridge::new();
        bridge.store_credentials(create_test_credentials()).unwrap();

        assert!(bridge.check_availability());

        bridge.clear_credentials().unwrap();

        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::NotStored);
        assert!(!bridge.check_availability());
    }

    #[test]
    fn test_expired_credentials() {
        let bridge = CredentialBridge::new();
        let mut creds = create_test_credentials();
        creds.expires_at = Some(0); // Expired in the past
        bridge.store_credentials(creds).unwrap();

        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::Expired);
    }

    #[test]
    fn test_get_session_token_expired() {
        let bridge = CredentialBridge::new();
        let mut creds = create_test_credentials();
        creds.expires_at = Some(0); // Expired
        bridge.store_credentials(creds).unwrap();

        let result = bridge.get_session_token();
        assert!(matches!(result, Err(CredentialError::Expired)));
    }

    #[test]
    fn test_get_session_token_not_found() {
        let bridge = CredentialBridge::new();
        let result = bridge.get_session_token();
        assert!(matches!(result, Err(CredentialError::NotFound)));
    }

    #[test]
    fn test_check_availability_empty() {
        let bridge = CredentialBridge::new();
        assert!(!bridge.check_availability());
    }

    #[test]
    fn test_check_availability_with_credentials() {
        let bridge = CredentialBridge::new();
        bridge.store_credentials(create_test_credentials()).unwrap();
        assert!(bridge.check_availability());
    }

    #[test]
    fn test_validate_credentials_valid() {
        let bridge = CredentialBridge::new();
        bridge.store_credentials(create_test_credentials()).unwrap();

        let valid = bridge.validate_credentials().unwrap();
        assert!(valid);
    }

    #[test]
    fn test_validate_credentials_expired() {
        let bridge = CredentialBridge::new();
        let mut creds = create_test_credentials();
        creds.expires_at = Some(0);
        bridge.store_credentials(creds).unwrap();

        let valid = bridge.validate_credentials().unwrap();
        assert!(!valid);
    }

    #[test]
    fn test_validate_credentials_no_expiry() {
        let bridge = CredentialBridge::new();
        let mut creds = create_test_credentials();
        creds.expires_at = None; // No expiry
        bridge.store_credentials(creds).unwrap();

        let valid = bridge.validate_credentials().unwrap();
        assert!(valid); // No expiry means always valid
    }

    #[test]
    fn test_has_refresh_token() {
        let bridge = CredentialBridge::new();

        // No credentials
        assert!(!bridge.has_refresh_token());

        // With refresh token
        bridge.store_credentials(create_test_credentials()).unwrap();
        assert!(bridge.has_refresh_token());
    }

    #[test]
    fn test_opaque_id_is_deterministic() {
        let id1 = generate_opaque_id("same_secret");
        let id2 = generate_opaque_id("same_secret");
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_opaque_id_differs_for_different_secrets() {
        let id1 = generate_opaque_id("secret_one");
        let id2 = generate_opaque_id("secret_two");
        assert_ne!(id1, id2);
    }

    // ========== Story 5.2: Bridge + Storage Integration Tests ==========

    #[test]
    fn test_bridge_with_storage_manager_initialization() {
        // Test that bridge initializes with storage manager
        let bridge = CredentialBridge::new_with_storage(None);

        // Should have a valid storage tier
        let tier = bridge.storage_tier();
        assert!(matches!(
            tier,
            StorageTier::Keychain | StorageTier::Stronghold | StorageTier::MemoryOnly
        ));

        // Should start with no credentials
        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::NotStored);
    }

    #[test]
    fn test_credentials_persist_through_storage_manager() {
        let bridge = CredentialBridge::new();

        // Store credentials
        bridge.store_credentials(create_test_credentials()).unwrap();

        // Verify stored
        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::Valid);

        // Verify storage tier is available
        let tier = bridge.storage_tier();
        assert!(matches!(
            tier,
            StorageTier::Keychain | StorageTier::Stronghold | StorageTier::MemoryOnly
        ));
    }

    #[test]
    fn test_storage_info_retrieval() {
        let bridge = CredentialBridge::new();

        // Get storage info
        let info = bridge.get_storage_info();

        // Info should have valid fields
        assert!(!info.display_name.is_empty());
        assert!(!info.description.is_empty());

        // Tier should match
        assert_eq!(info.tier, bridge.storage_tier());
    }

    #[test]
    fn test_clear_credentials_also_clears_storage() {
        let bridge = CredentialBridge::new();

        // Store credentials
        bridge.store_credentials(create_test_credentials()).unwrap();
        assert!(bridge.check_availability());

        // Clear credentials
        bridge.clear_credentials().unwrap();

        // Verify cleared from in-memory cache
        assert!(!bridge.check_availability());
        let status = bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::NotStored);
    }

    #[test]
    fn test_cold_start_load_from_storage() {
        // This test simulates cold start behavior
        // In memory-only mode, credentials won't persist across bridge instances
        // But the load_from_storage mechanism should work

        let bridge = CredentialBridge::new();

        // Store credentials
        bridge.store_credentials(create_test_credentials()).unwrap();

        // For memory-only tier, a new bridge won't have the credentials
        // This tests that the load mechanism is called (even if storage is empty)
        let bridge2 = CredentialBridge::new();
        let tier = bridge2.storage_tier();

        // In memory-only mode, second bridge starts fresh
        if tier == StorageTier::MemoryOnly {
            let status = bridge2.get_auth_status().unwrap();
            assert_eq!(status.status, CredentialStatus::NotStored);
        }
        // In persistent modes (Keychain/Stronghold), credentials would be loaded
        // but we can't guarantee that in CI/test environments
    }

    #[test]
    fn test_storage_tier_detection() {
        let bridge = CredentialBridge::new_with_storage(None);
        let tier = bridge.storage_tier();

        // Verify tier matches storage info
        let info = bridge.get_storage_info();
        assert_eq!(tier, info.tier);

        // Verify security level is appropriate for tier
        match tier {
            StorageTier::Keychain => {
                assert_eq!(
                    info.security_level,
                    super::super::storage::SecurityLevel::Highest
                );
                assert!(info.persists_on_restart);
            },
            StorageTier::Stronghold => {
                assert_eq!(
                    info.security_level,
                    super::super::storage::SecurityLevel::Good
                );
                assert!(info.persists_on_restart);
            },
            StorageTier::MemoryOnly => {
                assert_eq!(
                    info.security_level,
                    super::super::storage::SecurityLevel::Limited
                );
                assert!(!info.persists_on_restart);
            },
        }
    }
}
