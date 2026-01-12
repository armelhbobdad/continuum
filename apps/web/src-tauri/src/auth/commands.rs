//! Tauri OAuth Commands (Story 5.3, AC All)
//!
//! Exposes OAuth functionality to the frontend via Tauri IPC commands.
//! All commands are async and thread-safe through the managed state.
//!
//! # Commands
//!
//! - `start_oauth_flow` - Initiates OAuth flow, returns authorization URL
//! - `get_oauth_progress` - Returns current progress for UI
//! - `submit_manual_code` - Submits manually entered authorization code
//! - `cancel_oauth_flow` - Aborts the current flow
//! - `get_oauth_authorization_url` - Gets the authorization URL for browser

use super::state::OAuthManagedState;
#[cfg(test)]
use super::types::OAuthError;
use super::types::{OAuthConfig, OAuthProgress};
use tauri::State;

/// Get OAuth client ID from environment variable
///
/// # Arguments
///
/// * `provider` - The provider name (google, github, etc.)
///
/// # Returns
///
/// * `Ok(String)` - The client ID from environment
/// * `Err(String)` - Error if not configured
fn get_oauth_client_id(provider: &str) -> Result<String, String> {
    let env_var = match provider {
        "google" => "CONTINUUM_GOOGLE_CLIENT_ID",
        "github" => "CONTINUUM_GITHUB_CLIENT_ID",
        other => return Err(format!("Unknown OAuth provider: {other}")),
    };

    std::env::var(env_var).map_err(|_| {
        format!("OAuth client ID not configured. Set the {env_var} environment variable.")
    })
}

/// Start a new OAuth flow
///
/// Generates PKCE and state parameters, returns the authorization URL
/// that should be opened in the system browser.
///
/// # Arguments
///
/// * `provider` - Optional provider name (for future multi-provider support)
///
/// # Returns
///
/// * `Ok(String)` - Authorization URL to open in browser
/// * `Err(String)` - Error message if flow cannot be started
#[tauri::command]
pub async fn start_oauth_flow(
    provider: Option<String>,
    state: State<'_, OAuthManagedState>,
) -> Result<String, String> {
    let provider_name = provider.as_deref().unwrap_or("google");

    // Get client ID from environment variable
    let client_id = get_oauth_client_id(provider_name)?;

    let config = match provider_name {
        "google" => OAuthConfig::new(
            "google",
            client_id,
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            vec![
                "openid".to_string(),
                "email".to_string(),
                "profile".to_string(),
            ],
        ),
        "github" => OAuthConfig::new(
            "github",
            client_id,
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            vec!["read:user".to_string(), "user:email".to_string()],
        ),
        other => {
            return Err(format!("Unknown OAuth provider: {other}"));
        },
    };

    state
        .start_flow(Some(config))
        .await
        .map_err(|e| e.to_string())
}

/// Get the current OAuth progress
///
/// Returns the current state of the OAuth flow for UI display.
/// This should be polled at regular intervals (e.g., every 1 second).
///
/// # Returns
///
/// Current `OAuthProgress` with state, step description, and metadata
#[tauri::command]
pub async fn get_oauth_progress(
    state: State<'_, OAuthManagedState>,
) -> Result<OAuthProgress, String> {
    Ok(state.get_progress().await)
}

/// Submit a manually entered authorization code
///
/// Used when deep link and local server fallbacks fail,
/// and the user must copy-paste the authorization code.
///
/// # Arguments
///
/// * `code` - The authorization code from the provider
///
/// # Returns
///
/// * `Ok(())` - Code accepted, flow will proceed to token exchange
/// * `Err(String)` - Error if not in manual entry state
#[tauri::command]
pub async fn submit_manual_code(
    code: String,
    state: State<'_, OAuthManagedState>,
) -> Result<(), String> {
    state
        .submit_manual_code(code)
        .await
        .map_err(|e| e.to_string())
}

/// Cancel the current OAuth flow
///
/// Aborts any in-progress flow and resets state to Idle.
/// Safe to call even if no flow is in progress.
#[tauri::command]
pub async fn cancel_oauth_flow(state: State<'_, OAuthManagedState>) -> Result<(), String> {
    state.cancel().await;
    Ok(())
}

/// Get the authorization URL for opening in browser
///
/// Separate from start_oauth_flow for cases where the URL
/// needs to be obtained without starting the full flow.
///
/// # Arguments
///
/// * `provider` - Optional provider name
///
/// # Returns
///
/// * `Ok(String)` - Authorization URL
/// * `Err(String)` - Error if URL cannot be generated
#[tauri::command]
pub async fn get_oauth_authorization_url(
    provider: Option<String>,
    state: State<'_, OAuthManagedState>,
) -> Result<String, String> {
    // This is essentially the same as start_oauth_flow
    // but semantically different for the frontend
    start_oauth_flow(provider, state).await
}

/// Handle a deep link callback (internal use)
///
/// Called when the app receives a `continuum://callback` URL.
/// This is typically triggered by the deep link plugin, not the frontend.
///
/// # Arguments
///
/// * `url` - The callback URL
#[tauri::command]
pub async fn handle_oauth_callback(
    url: String,
    state: State<'_, OAuthManagedState>,
) -> Result<(), String> {
    state
        .handle_deep_link(&url)
        .await
        .map_err(|e| e.to_string())
}

/// Trigger fallback to local server
///
/// Called when deep link timeout occurs.
/// Returns the port number for building the new redirect URI.
#[tauri::command]
pub async fn fallback_to_local_server(state: State<'_, OAuthManagedState>) -> Result<u16, String> {
    state
        .fallback_to_local_server()
        .await
        .map_err(|e| e.to_string())
}

/// Trigger fallback to manual entry
///
/// Called when local server times out or is unavailable.
#[tauri::command]
pub async fn fallback_to_manual_entry(state: State<'_, OAuthManagedState>) -> Result<(), String> {
    state.fallback_to_manual_entry().await;
    Ok(())
}

/// Exchange authorization code for tokens and store via Credential Bridge (AC5)
///
/// Performs the token exchange with the OAuth provider and stores
/// the resulting tokens securely via the Credential Bridge.
///
/// # Returns
///
/// * `Ok(())` - Tokens exchanged and stored successfully
/// * `Err(String)` - Error message if exchange fails
#[tauri::command]
pub async fn exchange_oauth_tokens(
    oauth_state: State<'_, OAuthManagedState>,
    credential_state: State<'_, crate::credentials::CredentialState>,
) -> Result<(), String> {
    // Exchange authorization code for tokens
    let token_response = oauth_state
        .exchange_code_for_tokens()
        .await
        .map_err(|e| e.to_string())?;

    // Calculate expiry timestamp
    #[allow(clippy::cast_possible_wrap)]
    let expires_at = token_response.expires_in.map(|secs| {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        (now + secs) as i64
    });

    // Store tokens via Credential Bridge
    credential_state
        .store_oauth_tokens(
            token_response.access_token,
            token_response.refresh_token,
            expires_at,
        )
        .await
        .map_err(|e| e.to_string())?;

    // Mark OAuth flow as complete
    oauth_state.complete().await;

    Ok(())
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    // Note: Command tests require Tauri's test framework
    // These tests verify the helper functions and types

    #[test]
    fn test_oauth_config_creation() {
        let config = OAuthConfig::new(
            "google",
            "client_123",
            "https://example.com/auth",
            "https://example.com/token",
            vec!["openid".to_string()],
        );
        assert_eq!(config.provider, "google");
        assert_eq!(config.client_id, "client_123");
    }

    #[test]
    fn test_oauth_error_display() {
        let error = OAuthError::InvalidState;
        assert!(!error.to_string().is_empty());
    }

    #[tokio::test]
    async fn test_managed_state_progress() {
        let state = OAuthManagedState::new();
        let progress = state.get_progress().await;
        assert_eq!(progress.current_step, 0);
    }

    #[tokio::test]
    async fn test_managed_state_start_with_config() {
        let state = OAuthManagedState::new();
        let config = OAuthConfig::new(
            "test",
            "client",
            "https://example.com/auth",
            "https://example.com/token",
            vec![],
        );

        let result = state.start_flow(Some(config)).await;
        assert!(result.is_ok());

        let progress = state.get_progress().await;
        assert_eq!(progress.current_step, 1);
    }

    #[tokio::test]
    async fn test_managed_state_cancel() {
        let state = OAuthManagedState::new();
        let config = OAuthConfig::new(
            "test",
            "client",
            "https://example.com/auth",
            "https://example.com/token",
            vec![],
        );

        state
            .start_flow(Some(config))
            .await
            .expect("start should succeed");
        state.cancel().await;

        let progress = state.get_progress().await;
        assert_eq!(progress.current_step, 0);
    }

    #[tokio::test]
    async fn test_managed_state_manual_code() {
        let state = OAuthManagedState::new();
        let config = OAuthConfig::new(
            "test",
            "client",
            "https://example.com/auth",
            "https://example.com/token",
            vec![],
        );

        state
            .start_flow(Some(config))
            .await
            .expect("start should succeed");
        state.fallback_to_manual_entry().await;

        let result = state.submit_manual_code("test_code".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_managed_state_submit_code_wrong_state() {
        let state = OAuthManagedState::new();
        let config = OAuthConfig::new(
            "test",
            "client",
            "https://example.com/auth",
            "https://example.com/token",
            vec![],
        );

        state
            .start_flow(Some(config))
            .await
            .expect("start should succeed");
        // Don't call fallback_to_manual_entry

        let result = state.submit_manual_code("test_code".to_string()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_managed_state_local_server_fallback() {
        let state = OAuthManagedState::new();
        let config = OAuthConfig::new(
            "test",
            "client",
            "https://example.com/auth",
            "https://example.com/token",
            vec![],
        );

        state
            .start_flow(Some(config))
            .await
            .expect("start should succeed");

        let port = state
            .fallback_to_local_server()
            .await
            .expect("fallback should succeed");
        assert!(port > 0);

        let redirect_uri = state.get_local_server_redirect_uri().await;
        assert!(redirect_uri.is_some());
        assert!(redirect_uri.unwrap().contains(&port.to_string()));
    }
}
