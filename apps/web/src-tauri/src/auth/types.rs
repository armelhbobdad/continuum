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

/// OAuth flow state machine (AC1, AC2, AC4)
///
/// Represents the current state of an OAuth authentication flow.
/// 2-tier fallback: DeepLink → LocalServer
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
    /// Current step number (1-3)
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
            total_steps: 3,
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
            total_steps: 3,
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
            total_steps: 3,
            started_at,
            timeout_at: Some(timeout_at),
            cancellable: true,
        }
    }

    /// Create progress for exchanging tokens state
    pub fn exchanging_tokens(started_at: i64) -> Self {
        Self {
            state: OAuthState::ExchangingTokens,
            step_description: "Completing sign-in...".to_string(),
            current_step: 3,
            total_steps: 3,
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
            current_step: 3,
            total_steps: 3,
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
            total_steps: 3,
            started_at: 0,
            timeout_at: None,
            cancellable: false,
        }
    }
}

/// OAuth callback data from provider (AC1, AC2)
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
    /// Client Secret from the provider (required for Google desktop OAuth)
    /// Note: For desktop apps, Google requires client_secret even with PKCE
    pub client_secret: Option<String>,
    /// Authorization endpoint URL
    pub authorization_url: String,
    /// Token endpoint URL
    pub token_url: String,
    /// Requested scopes
    pub scopes: Vec<String>,
    /// Whether this provider supports custom URI scheme (deep links) for desktop apps.
    /// Google, GitHub, and Zoom do NOT support deep links for desktop - only loopback IP.
    /// See: https://developers.google.com/identity/protocols/oauth2/native-app#redirect-uri_loopback
    /// See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
    /// See: https://developers.zoom.us/docs/integrations/oauth/
    pub supports_deep_link: bool,
    /// Preferred port for local OAuth server (for providers like Zoom that require exact redirect URI).
    /// If None, an ephemeral port will be used (suitable for Google, GitHub).
    /// If Some(port), the local server will bind to that specific port.
    pub preferred_port: Option<u16>,
}

impl OAuthConfig {
    /// Create a new OAuth configuration (without client secret)
    pub fn new(
        provider: impl Into<String>,
        client_id: impl Into<String>,
        authorization_url: impl Into<String>,
        token_url: impl Into<String>,
        scopes: Vec<String>,
    ) -> Self {
        let provider_str = provider.into();
        // Google, GitHub, and Zoom do NOT support custom URI schemes for desktop apps
        // They only support loopback IP (http://127.0.0.1) as redirect URI
        let supports_deep_link = !matches!(provider_str.as_str(), "google" | "github" | "zoom");
        Self {
            provider: provider_str,
            client_id: client_id.into(),
            client_secret: None,
            authorization_url: authorization_url.into(),
            token_url: token_url.into(),
            scopes,
            supports_deep_link,
            preferred_port: None,
        }
    }

    /// Create a new OAuth configuration with client secret
    pub fn with_secret(
        provider: impl Into<String>,
        client_id: impl Into<String>,
        client_secret: impl Into<String>,
        authorization_url: impl Into<String>,
        token_url: impl Into<String>,
        scopes: Vec<String>,
    ) -> Self {
        let provider_str = provider.into();
        // Google, GitHub, and Zoom do NOT support custom URI schemes for desktop apps
        // They only support loopback IP (http://127.0.0.1) as redirect URI
        let supports_deep_link = !matches!(provider_str.as_str(), "google" | "github" | "zoom");
        Self {
            provider: provider_str,
            client_id: client_id.into(),
            client_secret: Some(client_secret.into()),
            authorization_url: authorization_url.into(),
            token_url: token_url.into(),
            scopes,
            supports_deep_link,
            preferred_port: None,
        }
    }

    /// Create a new OAuth configuration with client secret and preferred port
    pub fn with_secret_and_port(
        provider: impl Into<String>,
        client_id: impl Into<String>,
        client_secret: impl Into<String>,
        authorization_url: impl Into<String>,
        token_url: impl Into<String>,
        scopes: Vec<String>,
        preferred_port: u16,
    ) -> Self {
        let provider_str = provider.into();
        // Google, GitHub, and Zoom do NOT support custom URI schemes for desktop apps
        // They only support loopback IP (http://127.0.0.1) as redirect URI
        let supports_deep_link = !matches!(provider_str.as_str(), "google" | "github" | "zoom");
        Self {
            provider: provider_str,
            client_id: client_id.into(),
            client_secret: Some(client_secret.into()),
            authorization_url: authorization_url.into(),
            token_url: token_url.into(),
            scopes,
            supports_deep_link,
            preferred_port: Some(preferred_port),
        }
    }

    /// Create config with explicit deep link support setting
    pub fn with_deep_link_support(
        provider: impl Into<String>,
        client_id: impl Into<String>,
        authorization_url: impl Into<String>,
        token_url: impl Into<String>,
        scopes: Vec<String>,
        supports_deep_link: bool,
    ) -> Self {
        Self {
            provider: provider.into(),
            client_id: client_id.into(),
            client_secret: None,
            authorization_url: authorization_url.into(),
            token_url: token_url.into(),
            scopes,
            supports_deep_link,
            preferred_port: None,
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

/// Custom deserializer for user ID that handles both string and number formats.
///
/// GitHub returns `id` as a number (e.g., `"id": 1`), while Google returns
/// `sub` as a string (e.g., `"sub": "123456789"`). This deserializer handles both.
fn deserialize_id_from_any<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};

    struct IdVisitor;

    impl Visitor<'_> for IdVisitor {
        type Value = Option<String>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string or number")
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(Some(value.to_string()))
        }

        fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(Some(value))
        }

        fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(Some(value.to_string()))
        }

        fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(Some(value.to_string()))
        }

        fn visit_none<E>(self) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(None)
        }

        fn visit_unit<E>(self) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(None)
        }
    }

    deserializer.deserialize_any(IdVisitor)
}

/// User info response from OAuth provider's userinfo endpoint
///
/// Common structure across providers, with optional fields that may vary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthUserInfo {
    /// User's unique ID from the provider
    /// Note: GitHub returns `id` as a number, Google returns `sub` as a string.
    /// This field uses a custom deserializer to handle both formats.
    #[serde(
        alias = "id",
        alias = "sub",
        deserialize_with = "deserialize_id_from_any",
        default
    )]
    pub id: Option<String>,
    /// User's email address
    pub email: Option<String>,
    /// User's display name
    #[serde(alias = "name", alias = "display_name", alias = "displayName")]
    pub name: Option<String>,
    /// User's profile picture URL
    #[serde(alias = "picture", alias = "avatar_url", alias = "pic_url")]
    pub picture: Option<String>,
    /// Whether the email is verified (Google)
    pub email_verified: Option<bool>,
    /// User's login/username (GitHub)
    pub login: Option<String>,
}

impl OAuthUserInfo {
    /// Get the userinfo endpoint URL for a provider
    pub fn userinfo_url(provider: &str) -> Option<&'static str> {
        match provider {
            "google" => Some("https://www.googleapis.com/oauth2/v2/userinfo"),
            "github" => Some("https://api.github.com/user"),
            "zoom" => Some("https://api.zoom.us/v2/users/me"),
            _ => None,
        }
    }

    /// Convert to credential UserInfo
    pub fn to_user_info(&self) -> Option<crate::credentials::types::UserInfo> {
        let id = self.id.clone().or_else(|| self.login.clone())?;
        Some(crate::credentials::types::UserInfo {
            id,
            email: self.email.clone(),
            display_name: self.name.clone().or_else(|| self.login.clone()),
            picture: self.picture.clone(),
        })
    }
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

        let progress = OAuthProgress::exchanging_tokens(1000);
        assert_eq!(progress.current_step, 3);
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

    #[test]
    fn test_oauth_user_info_github_numeric_id() {
        // GitHub returns id as a number
        let json = r#"{
            "login": "octocat",
            "id": 12345,
            "name": "monalisa octocat",
            "email": "octocat@github.com",
            "avatar_url": "https://github.com/images/error/octocat.gif"
        }"#;

        let user_info: OAuthUserInfo =
            serde_json::from_str(json).expect("Failed to parse GitHub user info");
        assert_eq!(user_info.id, Some("12345".to_string()));
        assert_eq!(user_info.login, Some("octocat".to_string()));
        assert_eq!(user_info.name, Some("monalisa octocat".to_string()));
        assert_eq!(user_info.email, Some("octocat@github.com".to_string()));
        assert_eq!(
            user_info.picture,
            Some("https://github.com/images/error/octocat.gif".to_string())
        );
    }

    #[test]
    fn test_oauth_user_info_google_string_sub() {
        // Google returns sub as a string
        let json = r#"{
            "sub": "123456789012345678901",
            "name": "John Doe",
            "email": "john@example.com",
            "picture": "https://lh3.googleusercontent.com/photo.jpg",
            "email_verified": true
        }"#;

        let user_info: OAuthUserInfo =
            serde_json::from_str(json).expect("Failed to parse Google user info");
        assert_eq!(user_info.id, Some("123456789012345678901".to_string()));
        assert_eq!(user_info.name, Some("John Doe".to_string()));
        assert_eq!(user_info.email, Some("john@example.com".to_string()));
        assert_eq!(
            user_info.picture,
            Some("https://lh3.googleusercontent.com/photo.jpg".to_string())
        );
        assert_eq!(user_info.email_verified, Some(true));
    }

    #[test]
    fn test_oauth_user_info_to_user_info() {
        let oauth_info = OAuthUserInfo {
            id: Some("12345".to_string()),
            email: Some("test@example.com".to_string()),
            name: Some("Test User".to_string()),
            picture: Some("https://example.com/photo.jpg".to_string()),
            email_verified: Some(true),
            login: Some("testuser".to_string()),
        };

        let user_info = oauth_info
            .to_user_info()
            .expect("Conversion should succeed");
        assert_eq!(user_info.id, "12345");
        assert_eq!(user_info.email, Some("test@example.com".to_string()));
        assert_eq!(user_info.display_name, Some("Test User".to_string()));
        assert_eq!(
            user_info.picture,
            Some("https://example.com/photo.jpg".to_string())
        );
    }

    #[test]
    fn test_oauth_user_info_fallback_to_login() {
        // When id is None but login is present, should use login as id
        let oauth_info = OAuthUserInfo {
            id: None,
            email: None,
            name: None,
            picture: None,
            email_verified: None,
            login: Some("testuser".to_string()),
        };

        let user_info = oauth_info
            .to_user_info()
            .expect("Conversion should succeed");
        assert_eq!(user_info.id, "testuser");
        assert_eq!(user_info.display_name, Some("testuser".to_string()));
    }
}
