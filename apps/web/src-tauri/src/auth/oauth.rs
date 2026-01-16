//! OAuth Flow Manager (Story 5.3, AC1-6)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints for intentional patterns
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::unused_self)]
//!
//! Orchestrates the OAuth authentication flow with 2-tier fallback:
//! 1. Deep Link (`continuum://callback`) - fastest, preferred
//! 2. Local Server (`http://localhost:{port}/callback`) - fallback
//!
//! # Architecture
//!
//! The flow manager is a state machine that transitions through:
//! `Idle` → `AwaitingDeepLink` → `AwaitingLocalServer`
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
use super::types::{
    OAuthConfig, OAuthError, OAuthProgress, OAuthState, OAuthUserInfo, TokenResponse,
};
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

/// Redirect URI method for OAuth callback
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RedirectMethod {
    /// Deep link callback (continuum://callback)
    DeepLink,
    /// Local server callback (http://127.0.0.1:{port})
    LocalServer { port: u16 },
}

impl RedirectMethod {
    /// Get the redirect URI string for this method
    pub fn redirect_uri(&self) -> String {
        match self {
            Self::DeepLink => "continuum://callback".to_string(),
            // Google requires loopback redirect WITHOUT path for desktop apps
            Self::LocalServer { port } => format!("http://127.0.0.1:{port}"),
        }
    }
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
    /// Active redirect method (tracks which URI was used for authorization)
    redirect_method: RedirectMethod,
}

impl Default for FlowState {
    fn default() -> Self {
        Self {
            state: OAuthState::Idle,
            pkce: None,
            state_param: None,
            config: None,
            auth_code: None,
            redirect_method: RedirectMethod::DeepLink,
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
        let mut server_lock = self.local_server.lock().await;

        // Check if flow already in progress (allow starting from Idle, Failed, or Complete)
        if !matches!(
            state.state,
            OAuthState::Idle | OAuthState::Failed { .. } | OAuthState::Complete
        ) {
            return Err(OAuthError::InternalError {
                message: "OAuth flow already in progress".to_string(),
            });
        }

        // Generate PKCE
        let pkce = Pkce::generate();
        let state_param = generate_state();

        // Check if provider supports deep links (Google does NOT for desktop apps)
        if config.supports_deep_link {
            // Start with deep link method
            let redirect_method = RedirectMethod::DeepLink;

            // Build authorization URL
            let auth_url =
                self.build_authorization_url(&config, &pkce, &state_param, &redirect_method)?;

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
            state.redirect_method = redirect_method;

            Ok(auth_url)
        } else {
            // Provider doesn't support deep links (e.g., Google, GitHub, Zoom)
            // Start directly with local server
            let server = LocalOAuthServer::new(&state_param);
            let port = server.start(config.preferred_port).await?;

            let redirect_method = RedirectMethod::LocalServer { port };

            // Build authorization URL with local server redirect
            let auth_url =
                self.build_authorization_url(&config, &pkce, &state_param, &redirect_method)?;

            // Update state
            let now = now_ms();
            state.state = OAuthState::AwaitingLocalServer {
                port,
                started_at: now,
                timeout_at: now + LOCAL_SERVER_TIMEOUT_MS as i64,
            };
            state.pkce = Some(pkce);
            state.state_param = Some(state_param);
            state.config = Some(config);
            state.auth_code = None;
            state.redirect_method = redirect_method;

            // Store server for the background listener
            *server_lock = Some(server);

            // Drop locks before spawning background task
            drop(state);
            drop(server_lock);

            // Spawn background task to listen for callback
            let flow_state = Arc::clone(&self.flow_state);
            let local_server = Arc::clone(&self.local_server);
            tokio::spawn(async move {
                Self::background_await_callback(flow_state, local_server).await;
            });

            Ok(auth_url)
        }
    }

    /// Build the OAuth authorization URL with PKCE
    fn build_authorization_url(
        &self,
        config: &OAuthConfig,
        pkce: &Pkce,
        state: &str,
        redirect_method: &RedirectMethod,
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
            .append_pair("redirect_uri", &redirect_method.redirect_uri())
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

    /// Background task to wait for local server callback
    ///
    /// This is spawned by `start_flow` when using local server (e.g., Google OAuth).
    /// It waits for the callback and updates the flow state to `ExchangingTokens`.
    /// The frontend then calls `exchange_oauth_tokens` to complete the flow.
    async fn background_await_callback(
        flow_state: Arc<Mutex<FlowState>>,
        local_server: Arc<Mutex<Option<LocalOAuthServer>>>,
    ) {
        // Take ownership of the server
        let server = {
            let mut server_lock = local_server.lock().await;
            match server_lock.take() {
                Some(s) => s,
                None => {
                    // Server was already taken or stopped - this shouldn't happen
                    return;
                },
            }
        };

        // Wait for callback
        let callback_result = server.await_callback().await;
        server.stop().await;

        // Update flow state based on result
        let mut state = flow_state.lock().await;

        // Only update if still waiting for local server
        if !matches!(state.state, OAuthState::AwaitingLocalServer { .. }) {
            // State changed (e.g., cancelled) while waiting
            return;
        }

        match callback_result {
            Ok(callback_data) => {
                // Store auth code and transition to ExchangingTokens
                // The frontend will detect this state and call exchange_oauth_tokens
                state.auth_code = Some(callback_data.code);
                state.state = OAuthState::ExchangingTokens;
            },
            Err(OAuthError::Cancelled) => {
                // Flow was cancelled - reset to idle
                state.state = OAuthState::Idle;
            },
            Err(e) => {
                // Error (including timeout) - mark as failed
                state.state = OAuthState::Failed { error: e };
            },
        }
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
    /// Returns the port number AND a new authorization URL with the local server redirect.
    ///
    /// # Returns
    ///
    /// * `Ok((u16, String))` - The port number and new authorization URL
    /// * `Err(OAuthError)` - If server cannot be started
    pub async fn fallback_to_local_server(&self) -> Result<(u16, String), OAuthError> {
        let mut state = self.flow_state.lock().await;
        let mut server_lock = self.local_server.lock().await;

        // Get expected state
        let expected_state = state
            .state_param
            .as_ref()
            .ok_or_else(|| OAuthError::InternalError {
                message: "Missing state parameter".to_string(),
            })?
            .clone();

        // Get config and PKCE (we reuse the same PKCE for security)
        let config = state
            .config
            .as_ref()
            .ok_or_else(|| OAuthError::InternalError {
                message: "Missing OAuth config".to_string(),
            })?
            .clone();

        let pkce = state
            .pkce
            .as_ref()
            .ok_or_else(|| OAuthError::InternalError {
                message: "Missing PKCE data".to_string(),
            })?;

        // Create and start local server (use preferred port if configured)
        let preferred_port = config.preferred_port;
        let server = LocalOAuthServer::new(&expected_state);
        let port = server.start(preferred_port).await?;

        // Update redirect method to local server
        let redirect_method = RedirectMethod::LocalServer { port };

        // Build new authorization URL with local server redirect
        let auth_url =
            self.build_authorization_url(&config, pkce, &expected_state, &redirect_method)?;

        // Update state
        let now = now_ms();
        state.state = OAuthState::AwaitingLocalServer {
            port,
            started_at: now,
            timeout_at: now + LOCAL_SERVER_TIMEOUT_MS as i64,
        };
        state.redirect_method = redirect_method;

        // Store server for the background listener
        *server_lock = Some(server);

        // Drop locks before spawning background task
        drop(state);
        drop(server_lock);

        // Spawn background task to listen for callback
        let flow_state = Arc::clone(&self.flow_state);
        let local_server = Arc::clone(&self.local_server);
        tokio::spawn(async move {
            Self::background_await_callback(flow_state, local_server).await;
        });

        Ok((port, auth_url))
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
            Err(e) => Err(e),
        }
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
    /// Uses the same redirect_uri that was used during authorization.
    ///
    /// # Returns
    ///
    /// * `Ok(TokenResponse)` - Token response from provider
    /// * `Err(OAuthError)` - If exchange fails
    pub async fn exchange_code_for_tokens(&self) -> Result<TokenResponse, OAuthError> {
        // Extract all needed values under a single lock, then release it
        let (token_url, client_id, client_secret, code, code_verifier, redirect_uri) = {
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

            // Get the redirect URI that was used during authorization
            let redirect_uri = state.redirect_method.redirect_uri();

            (
                config.token_url.clone(),
                config.client_id.clone(),
                config.client_secret.clone(),
                code,
                code_verifier,
                redirect_uri,
            )
        };

        // Build token request
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code".to_string());
        params.insert("code", code);
        params.insert("redirect_uri", redirect_uri);
        params.insert("client_id", client_id);
        params.insert("code_verifier", code_verifier);

        // Add client_secret if provided (required for Google desktop OAuth)
        if let Some(secret) = client_secret {
            params.insert("client_secret", secret);
        }

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

    /// Fetch user info from the OAuth provider's userinfo endpoint
    ///
    /// Called after token exchange to get user profile (name, email, picture).
    ///
    /// # Arguments
    ///
    /// * `access_token` - The access token from token exchange
    ///
    /// # Returns
    ///
    /// * `Ok(Some(OAuthUserInfo))` - User info from provider
    /// * `Ok(None)` - If provider doesn't have userinfo endpoint or fetch failed gracefully
    /// * `Err(OAuthError)` - If fetch fails critically
    pub async fn fetch_user_info(
        &self,
        access_token: &str,
    ) -> Result<Option<OAuthUserInfo>, OAuthError> {
        let config = self.get_config().await;
        let provider = config.as_ref().map_or("unknown", |c| c.provider.as_str());

        // Get userinfo URL for this provider
        let Some(userinfo_url) = OAuthUserInfo::userinfo_url(provider) else {
            log::debug!("No userinfo endpoint for provider: {provider}");
            return Ok(None);
        };

        // Build request with appropriate headers for each provider
        let client = reqwest::Client::new();
        let mut request = client
            .get(userinfo_url)
            .header("Authorization", format!("Bearer {access_token}"));

        // GitHub requires User-Agent and Accept headers
        if provider == "github" {
            request = request
                .header("User-Agent", "Continuum-Desktop-App")
                .header("Accept", "application/vnd.github+json");
        }

        // Make the request
        let response = request.send().await.map_err(|e| {
            log::warn!("Failed to fetch userinfo: {e}");
            OAuthError::NetworkError {
                message: format!("Failed to fetch user info: {e}"),
            }
        })?;

        // Check response status
        if !response.status().is_success() {
            let status = response.status();
            log::warn!("Userinfo request failed with status: {status}");
            // Don't fail the whole flow for userinfo errors - return None
            return Ok(None);
        }

        // Parse response
        let mut user_info: OAuthUserInfo = response.json().await.map_err(|e| {
            log::warn!("Failed to parse userinfo response: {e}");
            OAuthError::InternalError {
                message: format!("Failed to parse user info: {e}"),
            }
        })?;

        // GitHub: If email is not in the main response, fetch from /user/emails endpoint
        // GitHub only returns email in /user if it's set as publicly visible
        if provider == "github" && user_info.email.is_none() {
            if let Some(email) = self.fetch_github_primary_email(access_token).await {
                user_info.email = Some(email);
            }
        }

        log::info!("Successfully fetched user info for provider: {provider}");
        Ok(Some(user_info))
    }

    /// Fetch the primary email from GitHub's /user/emails endpoint
    ///
    /// GitHub requires the `user:email` scope to access this endpoint.
    /// Returns the primary verified email, or any primary email if no verified one exists.
    async fn fetch_github_primary_email(&self, access_token: &str) -> Option<String> {
        #[derive(serde::Deserialize)]
        struct GitHubEmail {
            email: String,
            primary: bool,
            verified: bool,
        }

        let client = reqwest::Client::new();
        let response = client
            .get("https://api.github.com/user/emails")
            .header("Authorization", format!("Bearer {access_token}"))
            .header("User-Agent", "Continuum-Desktop-App")
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            log::debug!(
                "GitHub emails endpoint returned status: {}",
                response.status()
            );
            return None;
        }

        let emails: Vec<GitHubEmail> = response.json().await.ok()?;

        // Prefer primary + verified email, then just primary
        emails
            .iter()
            .find(|e| e.primary && e.verified)
            .or_else(|| emails.iter().find(|e| e.primary))
            .map(|e| e.email.clone())
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
        // Deep link redirect for initial flow
        assert!(auth_url.contains("redirect_uri=continuum%3A%2F%2Fcallback"));
        assert!(auth_url.contains("code_challenge="));
        assert!(auth_url.contains("code_challenge_method=S256"));
        assert!(auth_url.contains("state="));
        assert!(auth_url.contains("scope=openid+email"));
    }

    #[tokio::test]
    async fn test_start_flow_transitions_to_awaiting_deep_link() {
        let manager = OAuthFlowManager::new();
        // Use a non-Google provider that supports deep links
        let config = OAuthConfig::with_deep_link_support(
            "github",
            "client_id_123",
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            vec!["read:user".to_string()],
            true, // supports deep link
        );

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::AwaitingDeepLink { .. }));
    }

    #[tokio::test]
    async fn test_start_flow_google_skips_deep_link() {
        let manager = OAuthFlowManager::new();
        // Google does NOT support deep links for desktop - goes straight to local server
        let config = OAuthConfig::new(
            "google", // Google provider has supports_deep_link = false
            "client_id_123",
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            vec!["openid".to_string(), "email".to_string()],
        );

        manager
            .start_flow(config)
            .await
            .expect("start should succeed");

        let state = manager.get_state().await;
        // Google should start directly with local server, not deep link
        assert!(matches!(state, OAuthState::AwaitingLocalServer { .. }));
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

        let (port, auth_url) = manager
            .fallback_to_local_server()
            .await
            .expect("fallback should succeed");
        assert!(port > 0);

        // Auth URL should now have local server redirect (no path per Google spec)
        assert!(auth_url.contains(&format!("redirect_uri=http%3A%2F%2F127.0.0.1%3A{port}")));

        let state = manager.get_state().await;
        assert!(matches!(state, OAuthState::AwaitingLocalServer { .. }));
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
