//! Tauri commands for Credential Bridge (Story 5.1)
//!
//! Provides IPC commands for frontend to interact with credentials.
//! All commands return opaque data - raw credentials are NEVER exposed.
//!
//! # Commands
//! - `get_auth_status` - Get current authentication state (AC2)
//! - `get_session_token` - Get opaque session token (AC2)
//! - `clear_credentials` - Securely wipe all credentials (AC1, AC3)
//! - `check_credential_availability` - Fast availability check (AC4)
//! - `validate_credentials` - Check if credentials are valid (AC1)

use super::state::CredentialState;
use super::types::{AuthState, OpaqueToken};
use std::time::Instant;
use tauri::State;

/// Get authentication status (opaque, safe for frontend) (AC2)
///
/// Returns AuthState with credential status and opaque session info.
/// SECURITY: Never returns actual credentials.
#[tauri::command]
pub async fn get_auth_status(state: State<'_, CredentialState>) -> Result<AuthState, String> {
    state.bridge.get_auth_status().map_err(|e| e.to_string())
}

/// Get session token (opaque representation only) (AC2)
///
/// Returns OpaqueToken for session validation.
/// SECURITY: Returns opaque ID, NOT the actual token.
#[tauri::command]
pub async fn get_session_token(state: State<'_, CredentialState>) -> Result<OpaqueToken, String> {
    state.bridge.get_session_token().map_err(|e| e.to_string())
}

/// Clear all stored credentials (secure wipe) (AC1, AC3)
///
/// Securely erases all credentials from memory.
/// Called during logout or when user requests credential removal.
#[tauri::command]
pub async fn clear_credentials(state: State<'_, CredentialState>) -> Result<(), String> {
    state.bridge.clear_credentials().map_err(|e| e.to_string())
}

/// Check credential availability (fast check) (AC4)
///
/// Performance: Must complete within 500ms (NFR-CRED-2)
/// Returns true if credentials are stored, false otherwise.
#[tauri::command]
pub async fn check_credential_availability(
    state: State<'_, CredentialState>,
) -> Result<bool, String> {
    let start = Instant::now();
    let available = state.bridge.check_availability();
    let elapsed = start.elapsed();

    // Log performance warning if slow (for debugging)
    if elapsed.as_millis() > 500 {
        log::warn!(
            "Credential availability check took {}ms (> 500ms NFR-CRED-2)",
            elapsed.as_millis()
        );
    }

    Ok(available)
}

/// Validate credentials without exposing them (AC1)
///
/// Returns true if credentials exist and are not expired.
#[tauri::command]
pub async fn validate_credentials(state: State<'_, CredentialState>) -> Result<bool, String> {
    state
        .bridge
        .validate_credentials()
        .map_err(|e| e.to_string())
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
#[allow(clippy::cast_possible_wrap)]
mod command_tests {
    use super::super::state::CredentialState;
    use super::super::types::{CredentialStatus, StoredCredentials, UserInfo};
    use std::time::{Instant, SystemTime, UNIX_EPOCH};

    fn get_current_timestamp() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0)
    }

    fn create_test_credentials() -> StoredCredentials {
        let now = get_current_timestamp();

        StoredCredentials::new("test_access_token".to_string())
            .with_refresh_token("test_refresh_token".to_string())
            .with_expiry(now + 3600)
            .with_user_info(UserInfo {
                id: "user_1".to_string(),
                email: Some("test@test.com".to_string()),
                display_name: Some("Test".to_string()),
            })
    }

    #[test]
    fn test_credential_state_creation() {
        let state = CredentialState::new();
        assert!(!state.bridge.check_availability());
    }

    #[test]
    fn test_get_auth_status_empty() {
        let state = CredentialState::new();
        let status = state.bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::NotStored);
    }

    #[test]
    fn test_get_auth_status_with_credentials() {
        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let status = state.bridge.get_auth_status().unwrap();
        assert_eq!(status.status, CredentialStatus::Valid);
        assert!(status.session_id.is_some());
        assert!(status.user_info.is_some());
    }

    #[test]
    fn test_get_session_token_no_credentials() {
        let state = CredentialState::new();
        let result = state.bridge.get_session_token();
        assert!(result.is_err());
    }

    #[test]
    fn test_get_session_token_with_credentials() {
        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let token = state.bridge.get_session_token().unwrap();
        assert!(token.id.starts_with("opaque_"));
    }

    #[test]
    fn test_clear_credentials() {
        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();
        assert!(state.bridge.check_availability());

        state.bridge.clear_credentials().unwrap();
        assert!(!state.bridge.check_availability());
    }

    #[test]
    fn test_validate_credentials() {
        let state = CredentialState::new();

        // Empty - should return false
        assert!(!state.bridge.validate_credentials().unwrap());

        // With valid credentials
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();
        assert!(state.bridge.validate_credentials().unwrap());
    }

    #[test]
    fn test_availability_check_performance() {
        let state = CredentialState::new();

        let start = Instant::now();
        let _available = state.bridge.check_availability();
        let elapsed = start.elapsed();

        // NFR-CRED-2: Must complete within 500ms
        assert!(
            elapsed.as_millis() < 500,
            "Check took {}ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn test_session_token_does_not_contain_secret() {
        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let token = state.bridge.get_session_token().unwrap();

        // SECURITY: Verify no secrets in token
        assert!(!token.id.contains("access"));
        assert!(!token.id.contains("refresh"));
        assert!(!token.id.contains("token"));
        assert!(!token.id.contains("test_"));
    }
}
