//! OAuth Managed State (Story 5.3, AC All)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints
#![allow(clippy::single_match_else)]
//!
//! Provides thread-safe state management for OAuth flows in Tauri.
//! Uses Mutex-protected state to ensure safe concurrent access
//! from multiple frontend calls.

use super::oauth::OAuthFlowManager;
use super::types::{
    OAuthConfig, OAuthError, OAuthProgress, OAuthState, OAuthUserInfo, TokenResponse,
};
use std::sync::Arc;
use tokio::sync::Mutex;

/// OAuth managed state for Tauri
///
/// Wraps the OAuth flow manager in a thread-safe container
/// that can be managed by Tauri's state system.
#[derive(Debug, Clone)]
pub struct OAuthManagedState {
    /// The OAuth flow manager
    manager: Arc<Mutex<OAuthFlowManager>>,
    /// Default OAuth configuration (can be overridden per-flow)
    default_config: Arc<Mutex<Option<OAuthConfig>>>,
}

impl Default for OAuthManagedState {
    fn default() -> Self {
        Self::new()
    }
}

impl OAuthManagedState {
    /// Create a new OAuth managed state
    pub fn new() -> Self {
        Self {
            manager: Arc::new(Mutex::new(OAuthFlowManager::new())),
            default_config: Arc::new(Mutex::new(None)),
        }
    }

    /// Create OAuth managed state with a default configuration
    pub fn with_config(config: OAuthConfig) -> Self {
        Self {
            manager: Arc::new(Mutex::new(OAuthFlowManager::new())),
            default_config: Arc::new(Mutex::new(Some(config))),
        }
    }

    /// Set the default OAuth configuration
    pub async fn set_config(&self, config: OAuthConfig) {
        *self.default_config.lock().await = Some(config);
    }

    /// Get the current OAuth progress
    pub async fn get_progress(&self) -> OAuthProgress {
        let manager = self.manager.lock().await;
        manager.get_progress().await
    }

    /// Get the current OAuth state
    pub async fn get_state(&self) -> OAuthState {
        let manager = self.manager.lock().await;
        manager.get_state().await
    }

    /// Start a new OAuth flow
    ///
    /// Uses the provided config, or falls back to the default config.
    pub async fn start_flow(&self, config: Option<OAuthConfig>) -> Result<String, OAuthError> {
        let config = match config {
            Some(c) => c,
            None => {
                let default = self.default_config.lock().await;
                default.clone().ok_or_else(|| OAuthError::InternalError {
                    message: "No OAuth configuration provided".to_string(),
                })?
            },
        };

        let manager = self.manager.lock().await;
        manager.start_flow(config).await
    }

    /// Handle a deep link callback
    pub async fn handle_deep_link(&self, url: &str) -> Result<(), OAuthError> {
        let manager = self.manager.lock().await;
        manager.handle_deep_link(url).await
    }

    /// Transition to local server fallback
    ///
    /// Returns the port number and a new authorization URL with the local server redirect.
    pub async fn fallback_to_local_server(&self) -> Result<(u16, String), OAuthError> {
        let manager = self.manager.lock().await;
        manager.fallback_to_local_server().await
    }

    /// Get the redirect URI for local server
    pub async fn get_local_server_redirect_uri(&self) -> Option<String> {
        let manager = self.manager.lock().await;
        manager.get_local_server_redirect_uri().await
    }

    /// Transition to manual code entry
    pub async fn fallback_to_manual_entry(&self) {
        let manager = self.manager.lock().await;
        manager.fallback_to_manual_entry().await;
    }

    /// Submit a manually entered authorization code
    pub async fn submit_manual_code(&self, code: String) -> Result<(), OAuthError> {
        let manager = self.manager.lock().await;
        manager.submit_manual_code(code).await
    }

    /// Get the PKCE code verifier
    pub async fn get_code_verifier(&self) -> Option<String> {
        let manager = self.manager.lock().await;
        manager.get_code_verifier().await
    }

    /// Get the authorization code
    pub async fn get_auth_code(&self) -> Option<String> {
        let manager = self.manager.lock().await;
        manager.get_auth_code().await
    }

    /// Mark the flow as complete
    pub async fn complete(&self) {
        let manager = self.manager.lock().await;
        manager.complete().await;
    }

    /// Mark the flow as failed
    pub async fn fail(&self, error: OAuthError) {
        let manager = self.manager.lock().await;
        manager.fail(error).await;
    }

    /// Cancel the current OAuth flow
    pub async fn cancel(&self) {
        let manager = self.manager.lock().await;
        manager.cancel().await;
    }

    /// Check if deep link timeout should trigger fallback
    pub async fn check_deep_link_timeout(&self) -> bool {
        let manager = self.manager.lock().await;
        manager.check_deep_link_timeout().await
    }

    /// Check if local server timeout should trigger fallback
    pub async fn check_local_server_timeout(&self) -> bool {
        let manager = self.manager.lock().await;
        manager.check_local_server_timeout().await
    }

    /// Exchange authorization code for tokens (AC5)
    pub async fn exchange_code_for_tokens(&self) -> Result<TokenResponse, OAuthError> {
        let manager = self.manager.lock().await;
        manager.exchange_code_for_tokens().await
    }

    /// Fetch user info from the OAuth provider's userinfo endpoint
    pub async fn fetch_user_info(
        &self,
        access_token: &str,
    ) -> Result<Option<OAuthUserInfo>, OAuthError> {
        let manager = self.manager.lock().await;
        manager.fetch_user_info(access_token).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> OAuthConfig {
        OAuthConfig::new(
            "test",
            "client_id_123",
            "https://example.com/oauth/authorize",
            "https://example.com/oauth/token",
            vec!["openid".to_string()],
        )
    }

    #[tokio::test]
    async fn test_new_state_starts_idle() {
        let state = OAuthManagedState::new();
        let oauth_state = state.get_state().await;
        assert!(matches!(oauth_state, OAuthState::Idle));
    }

    #[tokio::test]
    async fn test_with_config() {
        let config = test_config();
        let state = OAuthManagedState::with_config(config);

        // Should be able to start flow without providing config
        let result = state.start_flow(None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_start_flow_without_config_fails() {
        let state = OAuthManagedState::new();
        let result = state.start_flow(None).await;
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[tokio::test]
    async fn test_set_config_and_start() {
        let state = OAuthManagedState::new();

        state.set_config(test_config()).await;

        let result = state.start_flow(None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_cancel_flow() {
        let state = OAuthManagedState::new();

        state
            .start_flow(Some(test_config()))
            .await
            .expect("start should succeed");
        state.cancel().await;

        let oauth_state = state.get_state().await;
        assert!(matches!(oauth_state, OAuthState::Idle));
    }

    #[tokio::test]
    async fn test_get_progress() {
        let state = OAuthManagedState::new();

        state
            .start_flow(Some(test_config()))
            .await
            .expect("start should succeed");

        let progress = state.get_progress().await;
        assert_eq!(progress.current_step, 1);
        assert!(progress.cancellable);
    }
}
