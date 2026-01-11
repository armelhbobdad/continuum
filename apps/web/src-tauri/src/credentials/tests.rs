//! Integration tests for Credential Bridge module (Story 5.1)
//!
//! These tests verify the end-to-end functionality of the credential system.

#![allow(clippy::unwrap_used)] // Tests use unwrap for clarity
#![allow(clippy::cast_possible_wrap)] // Timestamps are within i64 range

use super::bridge::CredentialBridge;
use super::state::CredentialState;
use super::types::{CredentialError, CredentialStatus, StoredCredentials, TokenType, UserInfo};
use std::sync::Arc;
use std::thread;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn create_valid_credentials() -> StoredCredentials {
    let now = get_current_timestamp();

    StoredCredentials::new("secret_access_token_abc123".to_string())
        .with_refresh_token("secret_refresh_token_xyz789".to_string())
        .with_expiry(now + 3600)
        .with_user_info(UserInfo {
            id: "user_integration_test".to_string(),
            email: Some("integration@test.com".to_string()),
            display_name: Some("Integration Test User".to_string()),
        })
        .with_api_key("openai".to_string(), "sk-secret-api-key".to_string())
}

fn create_expired_credentials() -> StoredCredentials {
    StoredCredentials::new("expired_token".to_string()).with_expiry(0)
}

// ============================================================================
// Module Integration Tests
// ============================================================================

#[test]
fn test_full_credential_lifecycle() {
    let bridge = CredentialBridge::new();

    // 1. Initially no credentials
    assert!(!bridge.check_availability());
    assert_eq!(
        bridge.get_auth_status().unwrap().status,
        CredentialStatus::NotStored
    );

    // 2. Store credentials
    bridge
        .store_credentials(create_valid_credentials())
        .unwrap();
    assert!(bridge.check_availability());

    // 3. Get auth status - should be valid with opaque session ID
    let status = bridge.get_auth_status().unwrap();
    assert_eq!(status.status, CredentialStatus::Valid);
    assert!(status.session_id.is_some());
    assert!(status.session_id.as_ref().unwrap().starts_with("opaque_"));

    // 4. Get session token - should be opaque
    let token = bridge.get_session_token().unwrap();
    assert!(token.id.starts_with("opaque_"));
    assert_eq!(token.token_type, TokenType::Session);

    // 5. Validate credentials
    assert!(bridge.validate_credentials().unwrap());

    // 6. Clear credentials
    bridge.clear_credentials().unwrap();
    assert!(!bridge.check_availability());
    assert_eq!(
        bridge.get_auth_status().unwrap().status,
        CredentialStatus::NotStored
    );
}

#[test]
fn test_expired_credential_handling() {
    let bridge = CredentialBridge::new();
    bridge
        .store_credentials(create_expired_credentials())
        .unwrap();

    // Auth status should show expired
    let status = bridge.get_auth_status().unwrap();
    assert_eq!(status.status, CredentialStatus::Expired);

    // Session token should fail with Expired error
    let result = bridge.get_session_token();
    assert!(matches!(result, Err(CredentialError::Expired)));

    // Validate should return false
    assert!(!bridge.validate_credentials().unwrap());
}

#[test]
fn test_opaque_tokens_never_contain_secrets() {
    let bridge = CredentialBridge::new();
    bridge
        .store_credentials(create_valid_credentials())
        .unwrap();

    let status = bridge.get_auth_status().unwrap();
    let session_id = status.session_id.unwrap();

    // Session ID should not contain any part of the actual token
    assert!(!session_id.contains("secret"));
    assert!(!session_id.contains("abc123"));
    assert!(!session_id.contains("access"));
    assert!(!session_id.contains("refresh"));
    assert!(!session_id.contains("xyz789"));
    assert!(!session_id.contains("api"));
    assert!(!session_id.contains("sk-"));

    let token = bridge.get_session_token().unwrap();
    assert!(!token.id.contains("secret"));
    assert!(!token.id.contains("abc123"));
}

#[test]
fn test_thread_safety() {
    let bridge = Arc::new(CredentialBridge::new());
    let mut handles = vec![];

    // Store credentials in main thread
    bridge
        .store_credentials(create_valid_credentials())
        .unwrap();

    // Spawn multiple threads accessing the bridge
    for i in 0..10 {
        let bridge_clone = Arc::clone(&bridge);
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                let _ = bridge_clone.check_availability();
                let _ = bridge_clone.get_auth_status();
                let _ = bridge_clone.validate_credentials();
            }
            i
        });
        handles.push(handle);
    }

    // All threads should complete without panicking
    for handle in handles {
        handle.join().expect("Thread panicked");
    }

    // Bridge should still be functional
    assert!(bridge.check_availability());
}

#[test]
fn test_cold_start_performance_requirement() {
    // NFR-CRED-2: Initialization + check must complete within 500ms
    let start = Instant::now();

    let state = CredentialState::new();
    let _available = state.check_availability();

    let elapsed = start.elapsed();

    // Strict assertion for performance
    assert!(
        elapsed.as_millis() < 500,
        "Cold start took {}ms (NFR-CRED-2 requires < 500ms)",
        elapsed.as_millis()
    );

    // Practical expectation: should be much faster (< 10ms)
    assert!(
        elapsed.as_millis() < 50,
        "Cold start took {}ms (expected < 50ms in practice)",
        elapsed.as_millis()
    );
}

#[test]
fn test_credential_state_integration() {
    let state = CredentialState::new();

    // Store via bridge
    state
        .bridge
        .store_credentials(create_valid_credentials())
        .unwrap();

    // Check via state method
    assert!(state.check_availability());

    // Clear via bridge
    state.bridge.clear_credentials().unwrap();

    // Verify cleared via state
    assert!(!state.check_availability());
}

#[test]
fn test_user_info_preserved_correctly() {
    let bridge = CredentialBridge::new();
    bridge
        .store_credentials(create_valid_credentials())
        .unwrap();

    let status = bridge.get_auth_status().unwrap();
    let user_info = status.user_info.expect("User info should be present");

    assert_eq!(user_info.id, "user_integration_test");
    assert_eq!(user_info.email, Some("integration@test.com".to_string()));
    assert_eq!(
        user_info.display_name,
        Some("Integration Test User".to_string())
    );
}

#[test]
fn test_secure_wipe_clears_all_data() {
    let bridge = CredentialBridge::new();
    bridge
        .store_credentials(create_valid_credentials())
        .unwrap();

    // Verify data exists
    assert!(bridge.check_availability());
    assert!(bridge.has_refresh_token());

    // Clear
    bridge.clear_credentials().unwrap();

    // Verify all cleared
    assert!(!bridge.check_availability());
    assert!(!bridge.has_refresh_token());

    let status = bridge.get_auth_status().unwrap();
    assert_eq!(status.status, CredentialStatus::NotStored);
    assert!(status.session_id.is_none());
    assert!(status.user_info.is_none());
}

#[test]
fn test_credentials_without_expiry_always_valid() {
    let bridge = CredentialBridge::new();

    // Create credentials without expiry
    let creds = StoredCredentials::new("no_expiry_token".to_string());
    bridge.store_credentials(creds).unwrap();

    assert_eq!(
        bridge.get_auth_status().unwrap().status,
        CredentialStatus::Valid
    );
    assert!(bridge.validate_credentials().unwrap());
}

#[test]
fn test_multiple_store_operations_overwrite() {
    let bridge = CredentialBridge::new();

    // Store first credentials
    let creds1 = StoredCredentials::new("first_token".to_string()).with_user_info(UserInfo {
        id: "user_1".to_string(),
        email: None,
        display_name: Some("First".to_string()),
    });
    bridge.store_credentials(creds1).unwrap();

    let status1 = bridge.get_auth_status().unwrap();
    let user1 = status1.user_info.unwrap();
    assert_eq!(user1.display_name, Some("First".to_string()));

    // Store second credentials - should overwrite
    let creds2 = StoredCredentials::new("second_token".to_string()).with_user_info(UserInfo {
        id: "user_2".to_string(),
        email: None,
        display_name: Some("Second".to_string()),
    });
    bridge.store_credentials(creds2).unwrap();

    let status2 = bridge.get_auth_status().unwrap();
    let user2 = status2.user_info.unwrap();
    assert_eq!(user2.display_name, Some("Second".to_string()));
    assert_eq!(user2.id, "user_2");
}
