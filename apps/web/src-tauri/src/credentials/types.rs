//! Credential types for the Credential Bridge (Story 5.1)
//!
//! Defines types for credential storage and opaque token exchange.
//! SECURITY: Types marked `pub(crate)` contain secrets and MUST NOT be exposed to frontend.

// Allow pub(crate) in module - these are intentionally crate-internal
#![allow(clippy::redundant_pub_crate)]
// Allow cast wrapping - timestamps are within valid range for application lifetime
#![allow(clippy::cast_possible_wrap)]
// Const fn not possible due to HashMap::new()
#![allow(clippy::missing_const_for_fn)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Status of stored credentials (AC1, AC2)
///
/// Safe to expose to frontend - contains no sensitive data.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CredentialStatus {
    /// No credentials stored
    NotStored,
    /// Credentials valid and not expired
    Valid,
    /// Credentials expired, need refresh
    Expired,
    /// Credentials invalid or corrupted
    Invalid,
}

/// Token type for opaque tokens (AC2)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TokenType {
    /// Session token
    Session,
    /// CSRF protection token
    Csrf,
}

/// User info safe to expose to frontend (AC2)
///
/// Contains only non-sensitive user information.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserInfo {
    /// User's unique ID
    pub id: String,
    /// User's email (if available)
    pub email: Option<String>,
    /// Display name
    pub display_name: Option<String>,
}

/// Authentication state returned to frontend (AC1, AC2)
///
/// SECURITY: This type NEVER contains raw credentials.
/// All sensitive data remains in Rust.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    /// Current credential status
    pub status: CredentialStatus,
    /// Opaque session identifier (NOT the actual token)
    pub session_id: Option<String>,
    /// When the session expires (Unix timestamp in seconds)
    pub expiry_timestamp: Option<i64>,
    /// Basic user info (no secrets)
    pub user_info: Option<UserInfo>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            status: CredentialStatus::NotStored,
            session_id: None,
            expiry_timestamp: None,
            user_info: None,
        }
    }
}

/// Opaque token for frontend use (AC2)
///
/// SECURITY: This is NOT the actual credential value.
/// It's an opaque reference managed by Rust.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpaqueToken {
    /// Token identifier (NOT the actual value)
    pub id: String,
    /// When this token expires (Unix timestamp in seconds)
    pub expiry: i64,
    /// Token type (session, csrf, etc.)
    pub token_type: TokenType,
}

/// OAuth secrets (NEVER exposed to frontend) (AC3)
/// Note: Will be used for OAuth flow in Story 5.3
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct OAuthSecrets {
    pub client_id: String,
    pub client_secret: String,
    pub authorization_code: Option<String>,
}

/// Internal stored credentials (NEVER exposed to frontend) (AC1, AC3)
///
/// SECURITY: This struct contains all sensitive credential data
/// and MUST NEVER be serialized or returned to JavaScript.
/// Note: Used in tests; populated via keychain integration in Story 5.2
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct StoredCredentials {
    /// The actual access token (NEVER returned to JS)
    pub access_token: String,
    /// The actual refresh token (NEVER returned to JS)
    pub refresh_token: Option<String>,
    /// API keys (NEVER returned to JS)
    pub api_keys: HashMap<String, String>,
    /// OAuth secrets (NEVER returned to JS)
    pub oauth_secrets: Option<OAuthSecrets>,
    /// When credentials were stored (Unix timestamp)
    pub stored_at: i64,
    /// When credentials expire (Unix timestamp)
    pub expires_at: Option<i64>,
    /// User info (safe to expose)
    pub user_info: Option<UserInfo>,
}

/// Builder methods for StoredCredentials
/// Note: Used in tests; will be populated via keychain integration in Story 5.2
#[allow(dead_code)]
impl StoredCredentials {
    /// Create new stored credentials
    pub fn new(access_token: String) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        Self {
            access_token,
            refresh_token: None,
            api_keys: HashMap::new(),
            oauth_secrets: None,
            stored_at: now,
            expires_at: None,
            user_info: None,
        }
    }

    /// Create credentials with expiry
    pub fn with_expiry(mut self, expires_at: i64) -> Self {
        self.expires_at = Some(expires_at);
        self
    }

    /// Create credentials with refresh token
    pub fn with_refresh_token(mut self, refresh_token: String) -> Self {
        self.refresh_token = Some(refresh_token);
        self
    }

    /// Create credentials with user info
    pub fn with_user_info(mut self, user_info: UserInfo) -> Self {
        self.user_info = Some(user_info);
        self
    }

    /// Add an API key
    pub fn with_api_key(mut self, name: String, key: String) -> Self {
        self.api_keys.insert(name, key);
        self
    }

    /// Add OAuth secrets
    pub fn with_oauth_secrets(mut self, secrets: OAuthSecrets) -> Self {
        self.oauth_secrets = Some(secrets);
        self
    }
}

/// Errors for credential operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CredentialError {
    /// No credentials stored
    NotFound,
    /// Credentials have expired
    Expired,
    /// Credentials are invalid
    Invalid,
    /// Storage operation failed
    StorageError(String),
    /// Internal error occurred
    InternalError(String),
}

impl std::fmt::Display for CredentialError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound => write!(f, "No credentials stored"),
            Self::Expired => write!(f, "Credentials have expired"),
            Self::Invalid => write!(f, "Credentials are invalid"),
            Self::StorageError(e) => write!(f, "Storage error: {e}"),
            Self::InternalError(e) => write!(f, "Internal error: {e}"),
        }
    }
}

impl std::error::Error for CredentialError {}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod type_tests {
    use super::*;

    #[test]
    fn test_credential_status_serialization() {
        let status = CredentialStatus::Valid;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"Valid\"");

        let deserialized: CredentialStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, CredentialStatus::Valid);
    }

    #[test]
    fn test_auth_state_default() {
        let state = AuthState::default();
        assert_eq!(state.status, CredentialStatus::NotStored);
        assert!(state.session_id.is_none());
        assert!(state.expiry_timestamp.is_none());
        assert!(state.user_info.is_none());
    }

    #[test]
    fn test_opaque_token_serialization() {
        let token = OpaqueToken {
            id: "opaque_abc123".to_string(),
            expiry: 1_704_067_200,
            token_type: TokenType::Session,
        };

        let json = serde_json::to_string(&token).unwrap();
        assert!(json.contains("opaque_abc123"));
        assert!(json.contains("Session"));
    }

    #[test]
    fn test_stored_credentials_builder() {
        let creds = StoredCredentials::new("access_token_123".to_string())
            .with_refresh_token("refresh_token_456".to_string())
            .with_expiry(1_704_067_200)
            .with_user_info(UserInfo {
                id: "user_1".to_string(),
                email: Some("test@example.com".to_string()),
                display_name: Some("Test User".to_string()),
            });

        assert_eq!(creds.access_token, "access_token_123");
        assert_eq!(creds.refresh_token, Some("refresh_token_456".to_string()));
        assert_eq!(creds.expires_at, Some(1_704_067_200));
        assert!(creds.user_info.is_some());
    }

    #[test]
    fn test_credential_error_display() {
        assert_eq!(
            CredentialError::NotFound.to_string(),
            "No credentials stored"
        );
        assert_eq!(
            CredentialError::Expired.to_string(),
            "Credentials have expired"
        );
        assert_eq!(
            CredentialError::StorageError("disk full".to_string()).to_string(),
            "Storage error: disk full"
        );
    }
}
