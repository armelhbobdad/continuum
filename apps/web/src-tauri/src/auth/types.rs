//! OAuth type definitions (Story 5.3)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints
#![allow(clippy::derivable_impls)]
#![allow(clippy::needless_pass_by_value)]
#![allow(clippy::missing_const_for_fn)]
//!
//! Defines the type system for OAuth authentication flows including:
//! - State machine for OAuth flow progression
//! - Progress information for UI updates
//! - Callback data from OAuth providers
//! - Error types for all failure modes
//! - Configuration for OAuth providers

use serde::{Deserialize, Serialize};
use std::fmt;

/// OAuth flow state machine (AC1, AC2, AC3, AC4)
///
/// Represents the current state of an OAuth authentication flow.
/// Transitions follow the fallback chain: DeepLink → LocalServer → ManualEntry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum OAuthState {
    /// No OAuth flow in progress
    Idle,
    /// Waiting for deep link callback (`continuum://callback`)
    AwaitingDeepLink {
        /// When this step started (Unix timestamp milliseconds)
        started_at: i64,
        /// When this step times out (Unix timestamp milliseconds)
        timeout_at: i64,
    },
    /// Deep link failed, waiting for local server callback
    AwaitingLocalServer {
        /// Port the local server is listening on
        port: u16,
        /// When this step started (Unix timestamp milliseconds)
        started_at: i64,
        /// When this step times out (Unix timestamp milliseconds)
        timeout_at: i64,
    },
    /// Local server failed, waiting for manual code entry
    AwaitingManualEntry {
        /// When this step started (Unix timestamp milliseconds)
        started_at: i64,
    },
    /// Code received, exchanging for tokens
    ExchangingTokens,
    /// OAuth completed successfully
    Complete,
    /// OAuth failed
    Failed {
        /// The error that caused the failure
        error: OAuthError,
    },
}

impl Default for OAuthState {
    fn default() -> Self {
        Self::Idle
    }
}

/// OAuth progress for UI display (AC4)
///
/// Provides human-readable progress information for the OAuth flow.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthProgress {
    /// Current state
    pub state: OAuthState,
    /// Human-readable step description
    pub step_description: String,
    /// Current step number (1-4)
    pub current_step: u8,
    /// Total steps
    pub total_steps: u8,
    /// When this step started (Unix timestamp milliseconds)
    pub started_at: i64,
    /// When this step times out (Unix timestamp milliseconds, if applicable)
    pub timeout_at: Option<i64>,
    /// Whether user can cancel
    pub cancellable: bool,
}

impl Default for OAuthProgress {
    fn default() -> Self {
        Self {
            state: OAuthState::Idle,
            step_description: "Ready to sign in".to_string(),
            current_step: 0,
            total_steps: 4,
            started_at: 0,
            timeout_at: None,
            cancellable: true,
        }
    }
}

impl OAuthProgress {
    /// Create progress for awaiting deep link state
    pub fn awaiting_deep_link(started_at: i64, timeout_at: i64) -> Self {
        Self {
            state: OAuthState::AwaitingDeepLink {
                started_at,
                timeout_at,
            },
            step_description: "Waiting for sign-in callback...".to_string(),
            current_step: 1,
            total_steps: 4,
            started_at,
            timeout_at: Some(timeout_at),
            cancellable: true,
        }
    }

    /// Create progress for awaiting local server state
    pub fn awaiting_local_server(port: u16, started_at: i64, timeout_at: i64) -> Self {
        Self {
            state: OAuthState::AwaitingLocalServer {
                port,
                started_at,
                timeout_at,
            },
            step_description: "Using alternative sign-in method...".to_string(),
            current_step: 2,
            total_steps: 4,
            started_at,
            timeout_at: Some(timeout_at),
            cancellable: true,
        }
    }

    /// Create progress for awaiting manual entry state
    pub fn awaiting_manual_entry(started_at: i64) -> Self {
        Self {
            state: OAuthState::AwaitingManualEntry { started_at },
            step_description: "Please enter the authorization code".to_string(),
            current_step: 3,
            total_steps: 4,
            started_at,
            timeout_at: None,
            cancellable: true,
        }
    }

    /// Create progress for exchanging tokens state
    pub fn exchanging_tokens(started_at: i64) -> Self {
        Self {
            state: OAuthState::ExchangingTokens,
            step_description: "Completing sign-in...".to_string(),
            current_step: 4,
            total_steps: 4,
            started_at,
            timeout_at: None,
            cancellable: false,
        }
    }

    /// Create progress for complete state
    pub fn complete() -> Self {
        Self {
            state: OAuthState::Complete,
            step_description: "Sign-in complete!".to_string(),
            current_step: 4,
            total_steps: 4,
            started_at: 0,
            timeout_at: None,
            cancellable: false,
        }
    }

    /// Create progress for failed state
    pub fn failed(error: OAuthError) -> Self {
        Self {
            state: OAuthState::Failed {
                error: error.clone(),
            },
            step_description: error.to_string(),
            current_step: 0,
            total_steps: 4,
            started_at: 0,
            timeout_at: None,
            cancellable: false,
        }
    }
}

/// OAuth callback data from provider (AC1, AC2, AC3)
///
/// Contains the authorization code and state from the OAuth provider callback.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthCallbackData {
    /// Authorization code from the provider
    pub code: String,
    /// State parameter for CSRF protection
    pub state: String,
    /// Error if OAuth failed at provider
    pub error: Option<String>,
    /// Error description from provider
    pub error_description: Option<String>,
}

impl OAuthCallbackData {
    /// Create new callback data with code and state
    pub fn new(code: String, state: String) -> Self {
        Self {
            code,
            state,
            error: None,
            error_description: None,
        }
    }

    /// Create callback data representing an error from the provider
    pub fn from_error(error: String, description: Option<String>) -> Self {
        Self {
            code: String::new(),
            state: String::new(),
            error: Some(error),
            error_description: description,
        }
    }

    /// Check if this callback represents an error
    pub fn is_error(&self) -> bool {
        self.error.is_some()
    }
}

/// OAuth error types (AC6)
///
/// Represents all possible error conditions during OAuth flow.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum OAuthError {
    /// Deep link callback timed out (30 seconds)
    DeepLinkTimeout,
    /// Local server callback timed out (30 seconds)
    LocalServerTimeout,
    /// State parameter mismatch (CSRF protection - ADR-CRED-2)
    InvalidState,
    /// Invalid authorization code
    InvalidCode,
    /// Network error during token exchange
    NetworkError {
        /// Error message
        message: String,
    },
    /// Provider returned an error
    ProviderError {
        /// Error code from provider
        code: String,
        /// Human-readable description
        description: String,
    },
    /// User cancelled the flow
    Cancelled,
    /// Internal error
    InternalError {
        /// Error message
        message: String,
    },
}

impl fmt::Display for OAuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DeepLinkTimeout => write!(f, "Deep link callback timed out"),
            Self::LocalServerTimeout => write!(f, "Local server callback timed out"),
            Self::InvalidState => write!(f, "Invalid state parameter (security check failed)"),
            Self::InvalidCode => write!(f, "Invalid authorization code"),
            Self::NetworkError { message } => write!(f, "Network error: {message}"),
            Self::ProviderError { code, description } => {
                write!(f, "Provider error {code}: {description}")
            },
            Self::Cancelled => write!(f, "OAuth flow was cancelled"),
            Self::InternalError { message } => write!(f, "Internal error: {message}"),
        }
    }
}

impl std::error::Error for OAuthError {}

/// OAuth provider configuration
///
/// Contains the configuration needed to initiate an OAuth flow with a provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthConfig {
    /// Provider identifier (e.g., "google", "github")
    pub provider: String,
    /// Client ID from the provider
    pub client_id: String,
    /// Authorization endpoint URL
    pub authorization_url: String,
    /// Token endpoint URL
    pub token_url: String,
    /// Requested scopes
    pub scopes: Vec<String>,
}

impl OAuthConfig {
    /// Create a new OAuth configuration
    pub fn new(
        provider: impl Into<String>,
        client_id: impl Into<String>,
        authorization_url: impl Into<String>,
        token_url: impl Into<String>,
        scopes: Vec<String>,
    ) -> Self {
        Self {
            provider: provider.into(),
            client_id: client_id.into(),
            authorization_url: authorization_url.into(),
            token_url: token_url.into(),
            scopes,
        }
    }
}

/// Token response from OAuth provider
///
/// Contains the access token and optional refresh token from the token exchange.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    /// Access token
    pub access_token: String,
    /// Token type (usually "Bearer")
    pub token_type: String,
    /// Expiration time in seconds
    pub expires_in: Option<u64>,
    /// Refresh token (if granted)
    pub refresh_token: Option<String>,
    /// Granted scopes (may differ from requested)
    pub scope: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_oauth_state_default_is_idle() {
        let state = OAuthState::default();
        assert_eq!(state, OAuthState::Idle);
    }

    #[test]
    fn test_oauth_state_serialization() {
        let state = OAuthState::AwaitingDeepLink {
            started_at: 1000,
            timeout_at: 31000,
        };
        let json = serde_json::to_string(&state).expect("serialization failed");
        assert!(json.contains("AwaitingDeepLink"));
        assert!(json.contains("1000"));
        assert!(json.contains("31000"));
    }

    #[test]
    fn test_oauth_error_display() {
        let errors = vec![
            (OAuthError::DeepLinkTimeout, "Deep link callback timed out"),
            (
                OAuthError::LocalServerTimeout,
                "Local server callback timed out",
            ),
            (
                OAuthError::InvalidState,
                "Invalid state parameter (security check failed)",
            ),
            (OAuthError::InvalidCode, "Invalid authorization code"),
            (
                OAuthError::NetworkError {
                    message: "connection refused".to_string(),
                },
                "Network error: connection refused",
            ),
            (
                OAuthError::ProviderError {
                    code: "access_denied".to_string(),
                    description: "User denied access".to_string(),
                },
                "Provider error access_denied: User denied access",
            ),
            (OAuthError::Cancelled, "OAuth flow was cancelled"),
            (
                OAuthError::InternalError {
                    message: "unexpected state".to_string(),
                },
                "Internal error: unexpected state",
            ),
        ];

        for (error, expected) in errors {
            assert_eq!(error.to_string(), expected);
        }
    }

    #[test]
    fn test_oauth_callback_data_creation() {
        let callback = OAuthCallbackData::new("auth_code_123".to_string(), "state_xyz".to_string());
        assert_eq!(callback.code, "auth_code_123");
        assert_eq!(callback.state, "state_xyz");
        assert!(!callback.is_error());
    }

    #[test]
    fn test_oauth_callback_data_error() {
        let callback = OAuthCallbackData::from_error(
            "access_denied".to_string(),
            Some("User denied access".to_string()),
        );
        assert!(callback.is_error());
        assert_eq!(callback.error, Some("access_denied".to_string()));
        assert_eq!(
            callback.error_description,
            Some("User denied access".to_string())
        );
    }

    #[test]
    fn test_oauth_progress_states() {
        let progress = OAuthProgress::awaiting_deep_link(1000, 31000);
        assert_eq!(progress.current_step, 1);
        assert!(progress.cancellable);

        let progress = OAuthProgress::awaiting_local_server(8080, 1000, 31000);
        assert_eq!(progress.current_step, 2);

        let progress = OAuthProgress::awaiting_manual_entry(1000);
        assert_eq!(progress.current_step, 3);
        assert!(progress.timeout_at.is_none());

        let progress = OAuthProgress::exchanging_tokens(1000);
        assert_eq!(progress.current_step, 4);
        assert!(!progress.cancellable);

        let progress = OAuthProgress::complete();
        assert!(matches!(progress.state, OAuthState::Complete));

        let progress = OAuthProgress::failed(OAuthError::Cancelled);
        assert!(matches!(progress.state, OAuthState::Failed { .. }));
    }

    #[test]
    fn test_oauth_config_creation() {
        let config = OAuthConfig::new(
            "google",
            "client_123",
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            vec!["openid".to_string(), "email".to_string()],
        );
        assert_eq!(config.provider, "google");
        assert_eq!(config.client_id, "client_123");
        assert_eq!(config.scopes.len(), 2);
    }
}
