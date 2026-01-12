//! OAuth Flow Manager (Story 5.3, AC1-6)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints for intentional patterns
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::unused_self)]
//!
//! Orchestrates the OAuth authentication flow with 3-tier fallback:
//! 1. Deep Link (`continuum://callback`) - fastest, preferred
//! 2. Local Server (`http://localhost:{port}/callback`) - fallback
//! 3. Manual Entry - user copies authorization code
//!
//! # Architecture
//!
//! The flow manager is a state machine that transitions through:
//! `Idle` → `AwaitingDeepLink` → `AwaitingLocalServer` → `AwaitingManualEntry`
//!        → `ExchangingTokens` → `Complete` or `Failed`
//!
//! # Security
//!
//! - PKCE for all flows
//! - State parameter for CSRF protection
//! - Tokens stored via Credential Bridge (never in WebView)

use super::deep_link::{DeepLinkHandler, DEEP_LINK_TIMEOUT_MS};
use super::local_server::{LocalOAuthServer, LOCAL_SERVER_TIMEOUT_MS};
use super::pkce::Pkce;
use super::types::{OAuthConfig, OAuthError, OAuthProgress, OAuthState, TokenResponse};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use getrandom::getrandom;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;

/// State parameter length in bytes (produces 32 base64url chars)
const STATE_BYTES: usize = 24;

/// Generate a cryptographically random state parameter for CSRF protection
///
/// Uses the OS CSPRNG for secure random bytes, then base64url encodes them.
fn generate_state() -> String {
    let mut bytes = [0u8; STATE_BYTES];
    getrandom(&mut bytes).expect("OS CSPRNG should be available");
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Get current Unix timestamp in milliseconds
fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// Internal flow state
#[derive(Debug)]
struct FlowState {
    /// Current OAuth state
    state: OAuthState,
    /// PKCE data for this flow
    pkce: Option<Pkce>,
    /// State parameter for CSRF protection
    state_param: Option<String>,
    /// OAuth configuration
    config: Option<OAuthConfig>,
    /// Authorization code (received from callback)
    auth_code: Option<String>,
}

impl Default for FlowState {
    fn default() -> Self {
        Self {
            state: OAuthState::Idle,
            pkce: None,
            state_param: None,
            config: None,
            auth_code: None,
        }
    }
}

/// OAuth Flow Manager (AC1-6)
///
/// Manages the complete OAuth flow including fallback chain,
/// state transitions, and token exchange.
#[derive(Debug)]
pub struct OAuthFlowManager {
    /// Internal flow state
    flow_state: Arc<Mutex<FlowState>>,
    /// Local OAuth server for fallback
    local_server: Arc<Mutex<Option<LocalOAuthServer>>>,
}

impl Default for OAuthFlowManager {
    fn default() -> Self {
        Self::new()
    }
}

impl OAuthFlowManager {
    /// Create a new OAuth flow manager
    pub fn new() -> Self {
        Self {
            flow_state: Arc::new(Mutex::new(FlowState::default())),
            local_server: Arc::new(Mutex::new(None)),
        }
    }

    /// Get current OAuth progress for UI display
    pub async fn get_progress(&self) -> OAuthProgress {
        let state = self.flow_state.lock().await;
        match &state.state {
            OAuthState::Idle => OAuthProgress::default(),
            OAuthState::AwaitingDeepLink {
                started_at,
                timeout_at,
            } => OAuthProgress::awaiting_deep_link(*started_at, *timeout_at),
            OAuthState::AwaitingLocalServer {
                port,
                started_at,
                timeout_at,
            } => OAuthProgress::awaiting_local_server(*port, *started_at, *timeout_at),
            OAuthState::AwaitingManualEntry { started_at } => {
                OAuthProgress::awaiting_manual_entry(*started_at)
            },
            OAuthState::ExchangingTokens => OAuthProgress::exchanging_tokens(now_ms()),
            OAuthState::Complete => OAuthProgress::complete(),
            OAuthState::Failed { error } => OAuthProgress::failed(error.clone()),
        }
    }

    /// Get the current OAuth state
    pub async fn get_state(&self) -> OAuthState {
        self.flow_state.lock().await.state.clone()
    }

    /// Start a new OAuth flow
    ///
    /// Generates PKCE and state parameters, prepares for deep link callback.
    ///
    /// # Arguments
    ///
    /// * `config` - OAuth provider configuration
    ///
    /// # Returns
    ///
    /// * `Ok(String)` - The authorization URL to open in browser
    /// * `Err(OAuthError)` - If flow cannot be started
    pub async fn start_flow(&self, config: OAuthConfig) -> Result<String, OAuthError> {
        let mut state = self.flow_state.lock().await;

        // Check if flow already in progress
        if !matches!(state.state, OAuthState::Idle | OAuthState::Failed { .. }) {
            return Err(OAuthError::InternalError {
                message: "OAuth flow already in progress".to_string(),
            });
        }

        // Generate PKCE
        let pkce = Pkce::generate();
        let state_param = generate_state();

        // Build authorization URL
        let auth_url = self.build_authorization_url(&config, &pkce, &state_param)?;

        // Update state
        let now = now_ms();
        state.state = OAuthState::AwaitingDeepLink {
            started_at: now,
            timeout_at: now + DEEP_LINK_TIMEOUT_MS,
        };
        state.pkce = Some(pkce);
        state.state_param = Some(state_param);
        state.config = Some(config);
        state.auth_code = None;

        Ok(auth_url)
    }

    /// Build the OAuth authorization URL with PKCE
    fn build_authorization_url(
        &self,
        config: &OAuthConfig,
        pkce: &Pkce,
        state: &str,
    ) -> Result<String, OAuthError> {
        use url::Url;

        let mut url =
            Url::parse(&config.authorization_url).map_err(|e| OAuthError::InternalError {
                message: format!("Invalid authorization URL: {e}"),
            })?;

        // Add required OAuth parameters
        url.query_pairs_mut()
            .append_pair("response_type", "code")
            .append_pair("client_id", &config.client_id)
            .append_pair("redirect_uri", "continuum://callback")
            .append_pair("state", state)
            .append_pair("code_challenge", &pkce.code_challenge)
            .append_pair("code_challenge_method", Pkce::challenge_method());

        // Add scopes if any
        if !config.scopes.is_empty() {
            url.query_pairs_mut()
                .append_pair("scope", &config.scopes.join(" "));
        }

        Ok(url.to_string())
    }

    /// Handle a deep link callback
    ///
    /// Called when the app receives a `continuum://callback` URL.
    ///
    /// # Arguments
    ///
    /// * `url` - The callback URL
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If callback was valid and code received
    /// * `Err(OAuthError)` - If callback was invalid
    pub async fn handle_deep_link(&self, url: &str) -> Result<(), OAuthError> {
        let mut state = self.flow_state.lock().await;

        // Verify we're expecting a deep link
        if !matches!(state.state, OAuthState::AwaitingDeepLink { .. }) {
            return Err(OAuthError::InternalError {
                message: "Not expecting deep link callback".to_string(),
            });
        }

        let expected_state =
            state
                .state_param
                .as_ref()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Missing state parameter".to_string(),
                })?;

        // Parse and validate the callback
        let handler = DeepLinkHandler::new(expected_state);
        let callback_data = handler.parse_and_validate(url)?;

        // Store the auth code and transition to exchanging tokens
        state.auth_code = Some(callback_data.code);
        state.state = OAuthState::ExchangingTokens;

        Ok(())
    }

    /// Transition to local server fallback
    ///
    /// Called when deep link timeout occurs.
    ///
    /// # Returns
    ///
    /// * `Ok(u16)` - The port number for the local server
    /// * `Err(OAuthError)` - If server cannot be started
    pub async fn fallback_to_local_server(&self) -> Result<u16, OAuthError> {
        let mut state = self.flow_state.lock().await;
        let mut server_lock = self.local_server.lock().await;

        // Get expected state
        let expected_state =
            state
                .state_param
                .as_ref()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Missing state parameter".to_string(),
                })?;

        // Create and start local server
        let server = LocalOAuthServer::new(expected_state);
        let port = server.start().await?;

        // Update state
        let now = now_ms();
        state.state = OAuthState::AwaitingLocalServer {
            port,
            started_at: now,
            timeout_at: now + LOCAL_SERVER_TIMEOUT_MS as i64,
        };

        *server_lock = Some(server);

        Ok(port)
    }

    /// Get the redirect URI for local server
    pub async fn get_local_server_redirect_uri(&self) -> Option<String> {
        let server_lock = self.local_server.lock().await;
        if let Some(server) = server_lock.as_ref() {
            server.redirect_uri().await
        } else {
            None
        }
    }

    /// Handle local server callback
    ///
    /// Waits for callback on the local server.
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If callback was valid and code received
    /// * `Err(OAuthError)` - If callback was invalid or timed out
    pub async fn await_local_server_callback(&self) -> Result<(), OAuthError> {
        // Take ownership of the server for the callback
        let server = {
            let mut server_lock = self.local_server.lock().await;
            server_lock
                .take()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Local server not started".to_string(),
                })?
        };

        // Wait for callback
        let callback_result = server.await_callback().await;
        server.stop().await;

        match callback_result {
            Ok(callback_data) => {
                let mut state = self.flow_state.lock().await;
                state.auth_code = Some(callback_data.code);
                state.state = OAuthState::ExchangingTokens;
                Ok(())
            },
            Err(e) => {
                // On timeout, transition to manual entry
                if matches!(e, OAuthError::LocalServerTimeout) {
                    self.fallback_to_manual_entry().await;
                }
                Err(e)
            },
        }
    }

    /// Transition to manual code entry fallback
    pub async fn fallback_to_manual_entry(&self) {
        let mut state = self.flow_state.lock().await;
        state.state = OAuthState::AwaitingManualEntry {
            started_at: now_ms(),
        };
    }

    /// Submit a manually entered authorization code
    ///
    /// # Arguments
    ///
    /// * `code` - The authorization code entered by the user
    ///
    /// # Returns
    ///
    /// * `Ok(())` - If code was accepted
    /// * `Err(OAuthError)` - If not in manual entry state
    pub async fn submit_manual_code(&self, code: String) -> Result<(), OAuthError> {
        let mut state = self.flow_state.lock().await;

        if !matches!(state.state, OAuthState::AwaitingManualEntry { .. }) {
            return Err(OAuthError::InternalError {
                message: "Not expecting manual code entry".to_string(),
            });
        }

        state.auth_code = Some(code);
        state.state = OAuthState::ExchangingTokens;

        Ok(())
    }

    /// Get the PKCE code verifier for token exchange
    ///
    /// # Returns
    ///
    /// * `Some(String)` - The code verifier
    /// * `None` - If no flow in progress
    pub async fn get_code_verifier(&self) -> Option<String> {
        let state = self.flow_state.lock().await;
        state.pkce.as_ref().map(|p| p.code_verifier.clone())
    }

    /// Get the authorization code for token exchange
    ///
    /// # Returns
    ///
    /// * `Some(String)` - The authorization code
    /// * `None` - If no code received yet
    pub async fn get_auth_code(&self) -> Option<String> {
        let state = self.flow_state.lock().await;
        state.auth_code.clone()
    }

    /// Mark the flow as complete
    pub async fn complete(&self) {
        let mut state = self.flow_state.lock().await;
        state.state = OAuthState::Complete;
    }

    /// Mark the flow as failed
    pub async fn fail(&self, error: OAuthError) {
        let mut state = self.flow_state.lock().await;
        state.state = OAuthState::Failed { error };
    }

    /// Cancel the OAuth flow
    pub async fn cancel(&self) {
        // Stop local server if running
        {
            let mut server_lock = self.local_server.lock().await;
            if let Some(server) = server_lock.take() {
                server.stop().await;
            }
        }

        // Reset state
        let mut state = self.flow_state.lock().await;
        *state = FlowState::default();
    }

    /// Check if a deep link timeout should trigger fallback
    pub async fn check_deep_link_timeout(&self) -> bool {
        let state = self.flow_state.lock().await;
        if let OAuthState::AwaitingDeepLink { timeout_at, .. } = state.state {
            now_ms() >= timeout_at
        } else {
            false
        }
    }

    /// Check if a local server timeout should trigger fallback
    pub async fn check_local_server_timeout(&self) -> bool {
        let state = self.flow_state.lock().await;
        if let OAuthState::AwaitingLocalServer { timeout_at, .. } = state.state {
            now_ms() >= timeout_at
        } else {
            false
        }
    }

    /// Exchange authorization code for tokens (AC5)
    ///
    /// Makes HTTP POST request to the token endpoint with PKCE code verifier.
    ///
    /// # Returns
    ///
    /// * `Ok(TokenResponse)` - Token response from provider
    /// * `Err(OAuthError)` - If exchange fails
    pub async fn exchange_code_for_tokens(&self) -> Result<TokenResponse, OAuthError> {
        // Extract all needed values under a single lock, then release it
        let (token_url, client_id, code, code_verifier) = {
            let state = self.flow_state.lock().await;

            // Verify we're in the token exchange state
            if !matches!(state.state, OAuthState::ExchangingTokens) {
                return Err(OAuthError::InternalError {
                    message: "Not in token exchange state".to_string(),
                });
            }

            // Get required parameters
            let config = state
                .config
                .as_ref()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Missing OAuth config".to_string(),
                })?;

            let code = state
                .auth_code
                .as_ref()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Missing authorization code".to_string(),
                })?
                .clone();

            let code_verifier = state
                .pkce
                .as_ref()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Missing PKCE data".to_string(),
                })?
                .code_verifier
                .clone();

            (
                config.token_url.clone(),
                config.client_id.clone(),
                code,
                code_verifier,
            )
        };

        // Build token request
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code".to_string());
        params.insert("code", code);
        params.insert("redirect_uri", "continuum://callback".to_string());
        params.insert("client_id", client_id);
        params.insert("code_verifier", code_verifier);

        // Make the token exchange request
        let client = reqwest::Client::new();
        let response = client
            .post(&token_url)
            .form(&params)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| OAuthError::NetworkError {
                message: format!("Token request failed: {e}"),
            })?;

        // Check response status
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(OAuthError::ProviderError {
                code: status.to_string(),
                description: body,
            });
        }

        // Parse token response
        let token_response: TokenResponse =
            response
                .json()
                .await
                .map_err(|e| OAuthError::InternalError {
                    message: format!("Failed to parse token response: {e}"),
                })?;

        Ok(token_response)
    }

    /// Get the OAuth config for external use
    pub async fn get_config(&self) -> Option<OAuthConfig> {
        self.flow_state.lock().await.config.clone()
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    fn test_config() -> OAuthConfig {
        OAuthConfig::new(
            "test",
            "client_id_123",
            "https://example.com/oauth/authorize",
            "https://example.com/oauth/token",
            vec!["openid".to_string(), "email".to_string()],
        )
    }

    #[tokio::test]
    async fn test_manager_starts_in_idle() {
        let manager = OAuthFlowManager::new();
        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::Idle));
    }

    #[tokio::test]
    async fn test_start_flow_generates_auth_url() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        let auth_url = manager
            .start_flow(config)
            .await
            .expect("start should succeed");

        assert!(auth_url.starts_with("https://example.com/oauth/authorize?"));
        assert!(auth_url.contains("client_id=client_id_123"));
        assert!(auth_url.contains("response_type=code"));
        assert!(auth_url.contains("redirect_uri=continuum%3A%2F%2Fcallback"));
        assert!(auth_url.contains("code_challenge="));
        assert!(auth_url.contains("code_challenge_method=S256"));
        assert!(auth_url.contains("state="));
        assert!(auth_url.contains("scope=openid+email"));
    }

    #[tokio::test]
    async fn test_start_flow_transitions_to_awaiting_deep_link() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::AwaitingDeepLink { .. }));
    }

    #[tokio::test]
    async fn test_cannot_start_flow_twice() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config.clone())
            .await
            .expect("first start should succeed");

        let result = manager.start_flow(config).await;
        assert!(matches!(result, Err(OAuthError::InternalError { .. })));
    }

    #[tokio::test]
    async fn test_cancel_resets_state() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        manager.cancel().await;

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::Idle));
    }

    #[tokio::test]
    async fn test_fallback_to_local_server() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");

        let port = manager
            .fallback_to_local_server()
            .await
            .expect("fallback should succeed");
        assert!(port > 0);

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::AwaitingLocalServer { .. }));
    }

    #[tokio::test]
    async fn test_fallback_to_manual_entry() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        manager.fallback_to_manual_entry().await;

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::AwaitingManualEntry { .. }));
    }

    #[tokio::test]
    async fn test_submit_manual_code() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        manager.fallback_to_manual_entry().await;
        manager
            .submit_manual_code("auth_code_123".to_string())
            .await
            .expect("submit should succeed");

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::ExchangingTokens));

        let code = manager.get_auth_code().await;
        assert_eq!(code, Some("auth_code_123".to_string()));
    }

    #[tokio::test]
    async fn test_complete_flow() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        manager.complete().await;

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::Complete));
    }

    #[tokio::test]
    async fn test_fail_flow() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        manager
            .fail(OAuthError::NetworkError {
                message: "Connection failed".to_string(),
            })
            .await;

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::Failed { .. }));
    }

    #[tokio::test]
    async fn test_get_progress() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        // Idle progress
        let progress = manager.get_progress().await;
        assert_eq!(progress.current_step, 0);

        // After start
        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        let progress = manager.get_progress().await;
        assert_eq!(progress.current_step, 1);
        assert!(progress.cancellable);

        // After fallback to manual
        manager.fallback_to_manual_entry().await;
        let progress = manager.get_progress().await;
        assert_eq!(progress.current_step, 3);
    }

    #[tokio::test]
    async fn test_code_verifier_available_after_start() {
        let manager = OAuthFlowManager::new();
        let config = test_config();

        // Before start
        assert!(manager.get_code_verifier().await.is_none());

        // After start
        manager
            .start_flow(config)
            .await
            .expect("start should succeed");
        let verifier = manager.get_code_verifier().await;
        assert!(verifier.is_some());
        assert!(verifier.unwrap().len() >= 43);
    }
}
