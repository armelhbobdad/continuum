//! Credential refresh module (Story 5.4)
//!
//! Provides silent credential refresh functionality for maintaining
//! authentication when returning from offline mode.
//!
//! # Security Architecture
//!
//! - Refresh tokens handled entirely in Rust backend
//! - New tokens stored securely via CredentialBridge
//! - No raw credentials exposed to frontend
//!
//! # Performance
//!
//! - Silent refresh timeout: 5 seconds (NFR-CRED-7)
//! - Exponential backoff: 1s, 2s, 4s max
//!
//! # Story References
//! - Story 5.4: Offline Authentication
//!   - AC5: Silent credential refresh on reconnect
//!   - AC6: Failed silent refresh handling
//!   - AC7: Manual refresh button

// Allow cast wrapping - timestamps are within valid range for application lifetime
#![allow(clippy::cast_possible_wrap)]

use serde::{Deserialize, Serialize};
use std::time::Duration;

use super::types::CredentialError;

/// Credential refresh timeout (NFR-CRED-7)
#[allow(dead_code)]
pub const REFRESH_TIMEOUT_SECONDS: u64 = 5;

/// Retry delays for exponential backoff (in milliseconds)
pub const RETRY_DELAYS_MS: [u64; 3] = [1000, 2000, 4000];

/// Maximum number of retry attempts
pub const MAX_RETRY_ATTEMPTS: usize = 3;

/// Refresh result returned to frontend (AC5, AC6)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshResult {
    /// Whether refresh was successful
    pub success: bool,
    /// Error message if refresh failed
    pub error: Option<String>,
    /// Whether re-authentication is required
    pub requires_reauth: bool,
    /// Time until next retry (if applicable)
    pub retry_after_ms: Option<u64>,
}

#[allow(dead_code)]
impl RefreshResult {
    /// Create a successful refresh result
    pub const fn success() -> Self {
        Self {
            success: true,
            error: None,
            requires_reauth: false,
            retry_after_ms: None,
        }
    }

    /// Create a failed refresh result with error
    pub const fn failure(error: String) -> Self {
        Self {
            success: false,
            error: Some(error),
            requires_reauth: false,
            retry_after_ms: None,
        }
    }

    /// Create a result requiring re-authentication
    pub const fn requires_reauth(error: String) -> Self {
        Self {
            success: false,
            error: Some(error),
            requires_reauth: true,
            retry_after_ms: None,
        }
    }

    /// Create a result with retry information
    pub const fn with_retry(mut self, retry_after_ms: u64) -> Self {
        self.retry_after_ms = Some(retry_after_ms);
        self
    }
}

/// Credential refresher for silent token refresh (AC5, AC6)
///
/// Handles refreshing access tokens using refresh tokens when
/// the application reconnects to the network.
pub struct CredentialRefresher {
    /// Refresh token endpoint URL
    token_url: String,
    /// Client ID for OAuth
    client_id: String,
    /// Current retry attempt (0-indexed)
    retry_attempt: usize,
}

#[allow(dead_code)]
impl CredentialRefresher {
    /// Create a new credential refresher
    pub const fn new(token_url: String, client_id: String) -> Self {
        Self {
            token_url,
            client_id,
            retry_attempt: 0,
        }
    }

    /// Get the refresh timeout duration (NFR-CRED-7)
    pub const fn timeout() -> Duration {
        Duration::from_secs(REFRESH_TIMEOUT_SECONDS)
    }

    /// Get the current retry delay based on attempt number
    pub const fn get_retry_delay(&self) -> Option<Duration> {
        if self.retry_attempt < RETRY_DELAYS_MS.len() {
            Some(Duration::from_millis(RETRY_DELAYS_MS[self.retry_attempt]))
        } else {
            None
        }
    }

    /// Check if more retries are available
    pub const fn can_retry(&self) -> bool {
        self.retry_attempt < MAX_RETRY_ATTEMPTS
    }

    /// Increment retry counter
    pub const fn increment_retry(&mut self) {
        self.retry_attempt += 1;
    }

    /// Reset retry counter (call on success)
    pub const fn reset_retries(&mut self) {
        self.retry_attempt = 0;
    }

    /// Get the token URL
    #[allow(dead_code)]
    pub fn token_url(&self) -> &str {
        &self.token_url
    }

    /// Get the client ID
    #[allow(dead_code)]
    pub fn client_id(&self) -> &str {
        &self.client_id
    }

    /// Silently refresh credentials using refresh_token (AC5)
    ///
    /// # Performance
    /// Target: < 5 seconds (NFR-CRED-7)
    ///
    /// # Arguments
    /// * `refresh_token` - The refresh token from stored credentials
    ///
    /// # Returns
    /// * `Ok(RefreshResult)` - Refresh result with success/failure status
    /// * `Err(CredentialError)` - If refresh cannot be attempted
    ///
    /// # Note
    /// This is a placeholder implementation. The actual HTTP request
    /// will be implemented when OAuth providers are configured.
    #[allow(clippy::unused_async)]
    pub async fn silent_refresh(
        &self,
        refresh_token: &str,
    ) -> Result<RefreshResult, CredentialError> {
        // Validate refresh token is present
        if refresh_token.is_empty() {
            return Ok(RefreshResult::requires_reauth(
                "No refresh token available".to_string(),
            ));
        }

        // Validate configuration
        if self.token_url.is_empty() {
            return Ok(RefreshResult::failure(
                "Token endpoint not configured".to_string(),
            ));
        }

        // TODO: Implement actual HTTP request to token endpoint
        // This will use reqwest with the configured timeout
        //
        // For now, return a placeholder error indicating not implemented
        // The actual implementation will:
        // 1. Send POST to token_url with grant_type=refresh_token
        // 2. Include client_id and refresh_token in request
        // 3. Parse response for new access_token and refresh_token
        // 4. Return success with new tokens
        //
        // On 401/403: return requires_reauth
        // On timeout/network error: return failure with retry info
        // On 429: return failure with retry_after from headers

        Err(CredentialError::InternalError(
            "Refresh not yet implemented - requires OAuth provider configuration".to_string(),
        ))
    }

    /// Attempt refresh with retries and exponential backoff
    ///
    /// # Arguments
    /// * `refresh_token` - The refresh token to use
    ///
    /// # Returns
    /// * `Ok(RefreshResult)` - Final result after all retry attempts
    /// * `Err(CredentialError)` - If a fatal error occurs
    #[allow(clippy::unused_async)]
    #[allow(dead_code)]
    pub async fn refresh_with_retries(
        &mut self,
        refresh_token: &str,
    ) -> Result<RefreshResult, CredentialError> {
        self.reset_retries();

        loop {
            match self.silent_refresh(refresh_token).await {
                Ok(result) if result.success => {
                    self.reset_retries();
                    return Ok(result);
                },
                Ok(result) if result.requires_reauth => {
                    // Re-auth required, no point retrying
                    return Ok(result);
                },
                Ok(result) => {
                    // Transient failure, try again if retries available
                    if self.can_retry() {
                        let delay = self.get_retry_delay();
                        self.increment_retry();

                        if let Some(delay_duration) = delay {
                            // In real implementation, we'd await the delay
                            // For now, just add retry info to the result
                            #[allow(clippy::cast_possible_truncation)]
                            return Ok(result.with_retry(delay_duration.as_millis() as u64));
                        }
                    }
                    return Ok(result);
                },
                Err(e) => {
                    // Check if we can retry this error
                    if self.can_retry() && is_retryable_error(&e) {
                        self.increment_retry();
                        continue;
                    }
                    return Err(e);
                },
            }
        }
    }
}

/// Check if an error is retryable
const fn is_retryable_error(error: &CredentialError) -> bool {
    matches!(
        error,
        CredentialError::StorageError(_) | CredentialError::InternalError(_)
    )
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod refresh_tests {
    use super::*;

    // ========== Task 4.8: Unit tests for refresh (10 tests) ==========

    #[test]
    fn test_refresh_result_success() {
        let result = RefreshResult::success();

        assert!(result.success);
        assert!(result.error.is_none());
        assert!(!result.requires_reauth);
        assert!(result.retry_after_ms.is_none());
    }

    #[test]
    fn test_refresh_result_failure() {
        let result = RefreshResult::failure("Network error".to_string());

        assert!(!result.success);
        assert_eq!(result.error, Some("Network error".to_string()));
        assert!(!result.requires_reauth);
    }

    #[test]
    fn test_refresh_result_requires_reauth() {
        let result = RefreshResult::requires_reauth("Token expired".to_string());

        assert!(!result.success);
        assert_eq!(result.error, Some("Token expired".to_string()));
        assert!(result.requires_reauth);
    }

    #[test]
    fn test_refresh_result_with_retry() {
        let result = RefreshResult::failure("Timeout".to_string()).with_retry(2000);

        assert!(!result.success);
        assert_eq!(result.retry_after_ms, Some(2000));
    }

    #[test]
    fn test_credential_refresher_creation() {
        let refresher = CredentialRefresher::new(
            "https://auth.example.com/token".to_string(),
            "client_123".to_string(),
        );

        assert_eq!(refresher.token_url(), "https://auth.example.com/token");
        assert_eq!(refresher.client_id(), "client_123");
        assert_eq!(refresher.retry_attempt, 0);
    }

    #[test]
    fn test_refresh_timeout_is_5_seconds() {
        let timeout = CredentialRefresher::timeout();
        assert_eq!(timeout, Duration::from_secs(5));
    }

    #[test]
    fn test_exponential_backoff_delays() {
        let mut refresher =
            CredentialRefresher::new("https://example.com".to_string(), "client".to_string());

        // First retry: 1 second
        assert_eq!(
            refresher.get_retry_delay(),
            Some(Duration::from_millis(1000))
        );

        refresher.increment_retry();
        // Second retry: 2 seconds
        assert_eq!(
            refresher.get_retry_delay(),
            Some(Duration::from_millis(2000))
        );

        refresher.increment_retry();
        // Third retry: 4 seconds
        assert_eq!(
            refresher.get_retry_delay(),
            Some(Duration::from_millis(4000))
        );

        refresher.increment_retry();
        // No more retries
        assert_eq!(refresher.get_retry_delay(), None);
        assert!(!refresher.can_retry());
    }

    #[test]
    fn test_can_retry_with_attempts() {
        let mut refresher =
            CredentialRefresher::new("https://example.com".to_string(), "client".to_string());

        assert!(refresher.can_retry()); // 0 < 3
        refresher.increment_retry();
        assert!(refresher.can_retry()); // 1 < 3
        refresher.increment_retry();
        assert!(refresher.can_retry()); // 2 < 3
        refresher.increment_retry();
        assert!(!refresher.can_retry()); // 3 >= 3
    }

    #[test]
    fn test_reset_retries() {
        let mut refresher =
            CredentialRefresher::new("https://example.com".to_string(), "client".to_string());

        refresher.increment_retry();
        refresher.increment_retry();
        assert_eq!(refresher.retry_attempt, 2);

        refresher.reset_retries();
        assert_eq!(refresher.retry_attempt, 0);
        assert!(refresher.can_retry());
    }

    #[test]
    fn test_is_retryable_error() {
        assert!(is_retryable_error(&CredentialError::StorageError(
            "test".to_string()
        )));
        assert!(is_retryable_error(&CredentialError::InternalError(
            "test".to_string()
        )));
        assert!(!is_retryable_error(&CredentialError::NotFound));
        assert!(!is_retryable_error(&CredentialError::Expired));
        assert!(!is_retryable_error(&CredentialError::Invalid));
    }

    #[tokio::test]
    async fn test_silent_refresh_empty_token() {
        let refresher =
            CredentialRefresher::new("https://example.com".to_string(), "client".to_string());

        let result = refresher.silent_refresh("").await.unwrap();

        assert!(!result.success);
        assert!(result.requires_reauth);
        assert!(result.error.unwrap().contains("No refresh token"));
    }

    #[tokio::test]
    async fn test_silent_refresh_no_token_url() {
        let refresher = CredentialRefresher::new(
            String::new(), // Empty token URL
            "client".to_string(),
        );

        let result = refresher
            .silent_refresh("valid_refresh_token")
            .await
            .unwrap();

        assert!(!result.success);
        assert!(result.error.unwrap().contains("not configured"));
    }
}
