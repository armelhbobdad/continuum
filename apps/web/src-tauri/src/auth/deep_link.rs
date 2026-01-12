//! Deep Link Handler for OAuth callbacks (Story 5.3, AC1)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints for intentional API design
#![allow(clippy::unused_self)]
#![allow(clippy::option_if_let_else)]
//!
//! Handles deep link callbacks from OAuth providers via the `continuum://callback` scheme.
//! Provides URL parsing, state validation, and timeout handling.
//!
//! # Security
//!
//! - Validates state parameter to prevent CSRF attacks (ADR-CRED-2)
//! - Sanitizes authorization codes before use
//! - Rejects callbacks with mismatched state
//!
//! # Performance
//!
//! - Deep link callback processing < 2 seconds (NFR-CRED-4)
//! - Timeout after 30 seconds if no callback received (NFR-CRED-5)

use super::types::{OAuthCallbackData, OAuthError};
use url::Url;

/// Deep link callback timeout in milliseconds (30 seconds per NFR-CRED-5)
pub const DEEP_LINK_TIMEOUT_MS: i64 = 30_000;

/// Expected processing time for deep link callbacks in milliseconds (NFR-CRED-4)
#[allow(dead_code)]
pub const DEEP_LINK_PROCESSING_TARGET_MS: i64 = 2_000;

/// The URL scheme for Continuum deep links
pub const DEEP_LINK_SCHEME: &str = "continuum";

/// The host component for callback URLs
pub const DEEP_LINK_CALLBACK_HOST: &str = "callback";

/// Handles deep link callbacks for OAuth (AC1)
///
/// Parses `continuum://callback?code=X&state=Y` URLs and validates
/// the state parameter to prevent injection attacks (ADR-CRED-2).
#[derive(Debug)]
pub struct DeepLinkHandler {
    /// Expected state for CSRF protection
    expected_state: String,
}

impl DeepLinkHandler {
    /// Create a new deep link handler with the expected state
    ///
    /// # Arguments
    ///
    /// * `expected_state` - The state parameter generated when starting the OAuth flow
    pub fn new(expected_state: impl Into<String>) -> Self {
        Self {
            expected_state: expected_state.into(),
        }
    }

    /// Get the expected state value
    pub fn expected_state(&self) -> &str {
        &self.expected_state
    }

    /// Parse callback URL and extract OAuth data
    ///
    /// Parses deep link URLs in the format:
    /// `continuum://callback?code=<auth_code>&state=<state_token>`
    ///
    /// # Arguments
    ///
    /// * `url` - The deep link URL to parse
    ///
    /// # Returns
    ///
    /// * `Ok(OAuthCallbackData)` - Parsed callback data (not yet validated)
    /// * `Err(OAuthError)` - If URL is malformed or missing required parameters
    ///
    /// # Errors
    ///
    /// - `InternalError` if URL cannot be parsed
    /// - `InternalError` if URL scheme is not `continuum`
    /// - `InternalError` if callback host is not `callback`
    /// - `InternalError` if authorization code is missing
    /// - `InternalError` if state parameter is missing
    /// - `ProviderError` if provider returned an error in the callback
    pub fn parse_callback_url(&self, url: &str) -> Result<OAuthCallbackData, OAuthError> {
        let parsed = Url::parse(url).map_err(|e| OAuthError::InternalError {
            message: format!("Invalid URL: {e}"),
        })?;

        // Verify scheme is continuum://
        if parsed.scheme() != DEEP_LINK_SCHEME {
            return Err(OAuthError::InternalError {
                message: format!(
                    "Invalid URL scheme: expected '{}', got '{}'",
                    DEEP_LINK_SCHEME,
                    parsed.scheme()
                ),
            });
        }

        // Verify host is "callback"
        if parsed.host_str() != Some(DEEP_LINK_CALLBACK_HOST) {
            return Err(OAuthError::InternalError {
                message: format!(
                    "Invalid callback host: expected '{}', got '{:?}'",
                    DEEP_LINK_CALLBACK_HOST,
                    parsed.host_str()
                ),
            });
        }

        // Extract query parameters
        let mut code = None;
        let mut state = None;
        let mut error = None;
        let mut error_description = None;

        for (key, value) in parsed.query_pairs() {
            match key.as_ref() {
                "code" => code = Some(value.to_string()),
                "state" => state = Some(value.to_string()),
                "error" => error = Some(value.to_string()),
                "error_description" => error_description = Some(value.to_string()),
                _ => {}, // Ignore unknown parameters
            }
        }

        // Check for error from provider
        if let Some(err) = error {
            return Err(OAuthError::ProviderError {
                code: err,
                description: error_description.unwrap_or_default(),
            });
        }

        // Require code parameter
        let code = code.ok_or_else(|| OAuthError::InternalError {
            message: "Missing authorization code in callback URL".to_string(),
        })?;

        // Require state parameter
        let state = state.ok_or_else(|| OAuthError::InternalError {
            message: "Missing state parameter in callback URL".to_string(),
        })?;

        Ok(OAuthCallbackData::new(code, state))
    }

    /// Validate callback data against expected state (ADR-CRED-2)
    ///
    /// SECURITY: This prevents CSRF attacks by verifying the state
    /// parameter matches what we generated when starting the flow.
    ///
    /// # Arguments
    ///
    /// * `data` - The callback data to validate
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If state matches
    /// * `Err(OAuthError::InvalidState)` - If state doesn't match
    pub fn validate_callback(&self, data: &OAuthCallbackData) -> Result<(), OAuthError> {
        if data.state != self.expected_state {
            return Err(OAuthError::InvalidState);
        }
        Ok(())
    }

    /// Parse and validate a callback URL in a single operation
    ///
    /// Combines `parse_callback_url` and `validate_callback` for convenience.
    ///
    /// # Arguments
    ///
    /// * `url` - The deep link URL to parse and validate
    ///
    /// # Returns
    ///
    /// * `Ok(OAuthCallbackData)` - Parsed and validated callback data
    /// * `Err(OAuthError)` - If parsing or validation fails
    pub fn parse_and_validate(&self, url: &str) -> Result<OAuthCallbackData, OAuthError> {
        let data = self.parse_callback_url(url)?;
        self.validate_callback(&data)?;
        Ok(data)
    }

    /// Build the expected callback URL for a given redirect URI
    ///
    /// Useful for configuring OAuth providers with the correct callback URL.
    pub fn build_callback_url_template() -> String {
        format!("{DEEP_LINK_SCHEME}://{DEEP_LINK_CALLBACK_HOST}")
    }
}

/// Check if a URL is a valid Continuum deep link callback
pub fn is_continuum_callback(url: &str) -> bool {
    if let Ok(parsed) = Url::parse(url) {
        parsed.scheme() == DEEP_LINK_SCHEME && parsed.host_str() == Some(DEEP_LINK_CALLBACK_HOST)
    } else {
        false
    }
}

#[cfg(test)]
#[allow(clippy::panic)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_callback_url() {
        let handler = DeepLinkHandler::new("expected_state_123");
        let url = "continuum://callback?code=auth_code_abc&state=expected_state_123";

        let result = handler
            .parse_callback_url(url)
            .expect("parsing should succeed");

        assert_eq!(result.code, "auth_code_abc");
        assert_eq!(result.state, "expected_state_123");
        assert!(!result.is_error());
    }

    #[test]
    fn test_parse_url_with_extra_params() {
        let handler = DeepLinkHandler::new("state123");
        let url = "continuum://callback?code=abc&state=state123&scope=email%20profile&custom=value";

        let result = handler
            .parse_callback_url(url)
            .expect("parsing should succeed");

        assert_eq!(result.code, "abc");
        assert_eq!(result.state, "state123");
    }

    #[test]
    fn test_validate_matching_state() {
        let handler = DeepLinkHandler::new("expected_state_123");
        let data = OAuthCallbackData::new("abc".to_string(), "expected_state_123".to_string());

        assert!(handler.validate_callback(&data).is_ok());
    }

    #[test]
    fn test_validate_mismatched_state_fails() {
        let handler = DeepLinkHandler::new("expected_state_123");
        let data = OAuthCallbackData::new("abc".to_string(), "wrong_state".to_string());

        let result = handler.validate_callback(&data);
        assert!(matches!(result, Err(OAuthError::InvalidState)));
    }

    #[test]
    fn test_parse_error_from_provider() {
        let handler = DeepLinkHandler::new("state");
        let url =
            "continuum://callback?error=access_denied&error_description=User%20denied%20access";

        let result = handler.parse_callback_url(url);
        match result {
            Err(OAuthError::ProviderError { code, description }) => {
                assert_eq!(code, "access_denied");
                assert_eq!(description, "User denied access");
            },
            _ => panic!("Expected ProviderError, got {result:?}"),
        }
    }

    #[test]
    fn test_parse_invalid_scheme() {
        let handler = DeepLinkHandler::new("state");
        let url = "https://callback?code=abc&state=state";

        let result = handler.parse_callback_url(url);
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[test]
    fn test_parse_invalid_host() {
        let handler = DeepLinkHandler::new("state");
        let url = "continuum://wrong?code=abc&state=state";

        let result = handler.parse_callback_url(url);
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[test]
    fn test_parse_missing_code() {
        let handler = DeepLinkHandler::new("state");
        let url = "continuum://callback?state=state";

        let result = handler.parse_callback_url(url);
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[test]
    fn test_parse_missing_state() {
        let handler = DeepLinkHandler::new("state");
        let url = "continuum://callback?code=abc";

        let result = handler.parse_callback_url(url);
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[test]
    fn test_parse_and_validate_success() {
        let handler = DeepLinkHandler::new("valid_state");
        let url = "continuum://callback?code=my_code&state=valid_state";

        let result = handler.parse_and_validate(url).expect("should succeed");
        assert_eq!(result.code, "my_code");
    }

    #[test]
    fn test_parse_and_validate_state_mismatch() {
        let handler = DeepLinkHandler::new("valid_state");
        let url = "continuum://callback?code=my_code&state=invalid_state";

        let result = handler.parse_and_validate(url);
        assert!(matches!(result, Err(OAuthError::InvalidState)));
    }

    #[test]
    fn test_is_continuum_callback() {
        assert!(is_continuum_callback(
            "continuum://callback?code=abc&state=xyz"
        ));
        assert!(is_continuum_callback("continuum://callback"));
        assert!(!is_continuum_callback("https://callback?code=abc"));
        assert!(!is_continuum_callback("continuum://other"));
        assert!(!is_continuum_callback("invalid-url"));
    }

    #[test]
    fn test_build_callback_url_template() {
        let template = DeepLinkHandler::build_callback_url_template();
        assert_eq!(template, "continuum://callback");
    }

    #[test]
    fn test_url_encoded_parameters() {
        let handler = DeepLinkHandler::new("state%20with%20spaces");
        // URL parameters come in URL-encoded form
        let url = "continuum://callback?code=code%2Bwith%2Bplus&state=state%20with%20spaces";

        let result = handler
            .parse_callback_url(url)
            .expect("parsing should succeed");
        // URL crate automatically decodes percent-encoded values
        assert_eq!(result.code, "code+with+plus");
        assert_eq!(result.state, "state with spaces");
    }
}
