//! Tauri commands for Credential Bridge (Story 5.1, 5.2, 5.4, 5.5)
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
//! - `get_storage_info` - Get storage tier info for UI (Story 5.2, AC6)
//! - `get_storage_tier` - Get current storage tier (Story 5.2)
//! - `validate_offline_credentials` - Validate credentials for offline use (Story 5.4, AC1)
//! - `get_offline_status` - Get offline validation result (Story 5.4, AC1-4)
//! - `refresh_credentials` - Manual credential refresh (Story 5.4, AC7)
//! - `get_degraded_mode` - Get current degraded mode level (Story 5.4, AC3)
//! - `start_session_migration` - Start anonymous-to-authenticated migration (Story 5.5)
//! - `get_migration_progress` - Get migration progress (Story 5.5)
//! - `cancel_migration` - Cancel in-progress migration (Story 5.5)
//! - `get_anonymous_session_count` - Get count for migration dialog (Story 5.5)

use super::migration::{MigrationChoice, MigrationProgress, MigrationResult, MigrationStatus};
use super::offline::{
    DegradedMode, OfflineCredentialState, OfflineValidationResult, OfflineValidator,
};
use super::refresh::RefreshResult;
use super::state::CredentialState;
use super::storage::{StorageInfo, StorageTier};
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

// ========== Story 5.2: Storage Commands ==========

/// Get storage tier information for UI display (AC6)
///
/// Returns StorageInfo with tier details for displaying to the user.
/// Includes display name, security level, and persistence status.
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_storage_info(state: State<'_, CredentialState>) -> Result<StorageInfo, String> {
    Ok(state.bridge.get_storage_info())
}

/// Get current storage tier (Story 5.2)
///
/// Returns the current storage tier (Keychain, Stronghold, or MemoryOnly).
/// Useful for quick checks without full StorageInfo.
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_storage_tier(state: State<'_, CredentialState>) -> Result<StorageTier, String> {
    Ok(state.bridge.storage_tier())
}

// ========== Story 5.4: Offline Authentication Commands ==========

/// Validate credentials for offline use (Story 5.4, AC1, AC4)
///
/// Validates stored credentials locally without network access.
/// Performance: Must complete within 100ms (NFR-CRED-6)
///
/// Returns OfflineValidationResult with validity status and degraded mode.
#[tauri::command]
pub async fn validate_offline_credentials(
    state: State<'_, CredentialState>,
) -> Result<OfflineValidationResult, String> {
    let start = Instant::now();

    // Get stored credentials
    let credentials = state
        .bridge
        .get_stored_credentials()
        .map_err(|e| e.to_string())?;

    // Create offline state from credentials
    let offline_state = OfflineCredentialState::from_timestamp(credentials.stored_at);

    // Validate offline
    let result =
        OfflineValidator::validate(&credentials, &offline_state).map_err(|e| e.to_string())?;

    let elapsed = start.elapsed();

    // Performance warning if slow (NFR-CRED-6)
    if elapsed.as_millis() > 100 {
        log::warn!(
            "Offline validation took {}ms (> 100ms NFR-CRED-6)",
            elapsed.as_millis()
        );
    }

    Ok(result)
}

/// Get offline status (Story 5.4, AC1-4)
///
/// Returns the current offline validation result including:
/// - Whether credentials are valid for offline use
/// - Current degraded mode (FullAccess, ReadOnly, RequiresReauth)
/// - Days remaining in offline window
/// - Whether refresh is needed when online
#[tauri::command]
pub async fn get_offline_status(
    state: State<'_, CredentialState>,
) -> Result<OfflineValidationResult, String> {
    // Delegate to validate_offline_credentials
    validate_offline_credentials(state).await
}

/// Refresh credentials manually (Story 5.4, AC7)
///
/// Triggers a credential refresh attempt.
/// This is a placeholder that returns a requires-reauth result
/// until OAuth providers are configured.
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn refresh_credentials(
    _state: State<'_, CredentialState>,
) -> Result<RefreshResult, String> {
    // TODO: Implement actual refresh when OAuth providers are configured
    // For now, return a result indicating refresh is not yet implemented
    Ok(RefreshResult::failure(
        "Credential refresh not yet configured - OAuth providers required".to_string(),
    ))
}

/// Get current degraded mode (Story 5.4, AC3)
///
/// Returns the current access level based on offline credential validity:
/// - FullAccess: Within 30-day offline window
/// - ReadOnly: 30-37 days offline (grace period)
/// - RequiresReauth: > 37 days offline
#[tauri::command]
pub async fn get_degraded_mode(state: State<'_, CredentialState>) -> Result<DegradedMode, String> {
    // Get stored credentials
    let credentials = state
        .bridge
        .get_stored_credentials()
        .map_err(|e| e.to_string())?;

    // Create offline state and calculate mode
    let offline_state = OfflineCredentialState::from_timestamp(credentials.stored_at);
    Ok(offline_state.calculate_mode())
}

// ========== Story 5.5: Migration Commands ==========

/// Start anonymous-to-authenticated migration (Story 5.5, AC3)
///
/// Initiates migration of anonymous sessions to the authenticated user.
/// The migration runs atomically - all sessions are migrated or none.
///
/// # Arguments
/// * `choice` - User's migration choice (merge, keep-separate, discard)
/// * `user_id` - The authenticated user's ID to assign ownership
///
/// # Returns
/// * `Ok(())` - Migration started successfully
/// * `Err(String)` - If migration is already in progress or failed to start
#[tauri::command]
pub async fn start_session_migration(
    state: State<'_, CredentialState>,
    choice: MigrationChoice,
    user_id: String,
) -> Result<(), String> {
    state.migration.start_migration(choice, user_id)
}

/// Get migration progress (Story 5.5, AC4)
///
/// Returns the current migration progress for UI display.
/// Returns None if no migration is in progress.
///
/// # Returns
/// * `Ok(Some(MigrationProgress))` - Current progress info
/// * `Ok(None)` - No migration in progress
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_migration_progress(
    state: State<'_, CredentialState>,
) -> Result<Option<MigrationProgress>, String> {
    Ok(state.migration.get_progress())
}

/// Get migration status (Story 5.5, AC4)
///
/// Returns the current migration status.
///
/// # Returns
/// * `Ok(MigrationStatus)` - Current status (idle, in-progress, completed, failed)
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_migration_status(
    state: State<'_, CredentialState>,
) -> Result<MigrationStatus, String> {
    Ok(state.migration.get_status())
}

/// Get migration result (Story 5.5, AC3, AC5)
///
/// Returns the result after migration completes.
/// Returns None if migration hasn't completed.
///
/// # Returns
/// * `Ok(Some(MigrationResult))` - Migration result
/// * `Ok(None)` - Migration not yet completed
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_migration_result(
    state: State<'_, CredentialState>,
) -> Result<Option<MigrationResult>, String> {
    Ok(state.migration.get_result())
}

/// Cancel in-progress migration (Story 5.5, AC5)
///
/// Requests cancellation of an in-progress migration.
/// The migration will stop at the next safe point and rollback.
///
/// # Returns
/// * `Ok(())` - Cancellation requested
/// * `Err(String)` - If no migration is in progress
#[tauri::command]
pub async fn cancel_migration(state: State<'_, CredentialState>) -> Result<(), String> {
    state.migration.cancel()
}

/// Get anonymous session count for migration dialog (Story 5.5, AC2)
///
/// Returns the count of anonymous sessions that would be affected by migration.
/// This is a placeholder that returns 0 - actual implementation will query
/// the session store when integrated.
///
/// # Returns
/// * `Ok(usize)` - Number of anonymous sessions
#[tauri::command]
#[allow(clippy::unused_async)] // Tauri commands require async signature
pub async fn get_anonymous_session_count(
    _state: State<'_, CredentialState>,
) -> Result<usize, String> {
    // TODO: Integrate with session store to get actual count
    // For now, return 0 as a placeholder
    Ok(0)
}

/// Reset migration state (Story 5.5)
///
/// Resets the migration manager to idle state.
/// Used after user acknowledges migration result.
///
/// # Returns
/// * `Ok(())` - Reset successful
/// * `Err(String)` - If reset failed
#[tauri::command]
pub async fn reset_migration(state: State<'_, CredentialState>) -> Result<(), String> {
    state.migration.reset()
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

    // ========== Story 5.2: Storage Command Tests ==========

    #[test]
    fn test_get_storage_info() {
        use super::super::storage::{SecurityLevel, StorageTier};

        let state = CredentialState::new();
        let info = state.bridge.get_storage_info();

        // Info should have valid fields
        assert!(!info.display_name.is_empty());
        assert!(!info.description.is_empty());

        // Security level should match tier
        match info.tier {
            StorageTier::Keychain => {
                assert_eq!(info.security_level, SecurityLevel::Highest);
                assert!(info.persists_on_restart);
            },
            StorageTier::Stronghold => {
                assert_eq!(info.security_level, SecurityLevel::Good);
                assert!(info.persists_on_restart);
            },
            StorageTier::MemoryOnly => {
                assert_eq!(info.security_level, SecurityLevel::Limited);
                assert!(!info.persists_on_restart);
            },
        }
    }

    #[test]
    fn test_get_storage_tier() {
        use super::super::storage::StorageTier;

        let state = CredentialState::new();
        let tier = state.bridge.storage_tier();

        // Should be a valid tier
        assert!(matches!(
            tier,
            StorageTier::Keychain | StorageTier::Stronghold | StorageTier::MemoryOnly
        ));

        // Tier should match storage info
        let info = state.bridge.get_storage_info();
        assert_eq!(tier, info.tier);
    }

    #[test]
    fn test_storage_info_consistency() {
        let state = CredentialState::new();

        // Get info multiple times
        let info1 = state.bridge.get_storage_info();
        let info2 = state.bridge.get_storage_info();

        // Should be consistent
        assert_eq!(info1.tier, info2.tier);
        assert_eq!(info1.display_name, info2.display_name);
        assert_eq!(info1.security_level, info2.security_level);
        assert_eq!(info1.persists_on_restart, info2.persists_on_restart);
    }

    // ========== Story 5.4: Offline Command Tests (8 tests) ==========

    #[test]
    fn test_get_stored_credentials_not_found() {
        let state = CredentialState::new();
        let result = state.bridge.get_stored_credentials();
        assert!(result.is_err());
    }

    #[test]
    fn test_get_stored_credentials_with_credentials() {
        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let creds = state.bridge.get_stored_credentials().unwrap();
        assert_eq!(creds.access_token, "test_access_token");
    }

    #[test]
    fn test_offline_validation_with_valid_credentials() {
        use super::super::offline::{OfflineCredentialState, OfflineValidator};

        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let creds = state.bridge.get_stored_credentials().unwrap();
        let offline_state = OfflineCredentialState::from_timestamp(creds.stored_at);

        let result = OfflineValidator::validate(&creds, &offline_state).unwrap();
        assert!(result.is_valid);
        assert_eq!(result.mode, super::super::offline::DegradedMode::FullAccess);
    }

    #[test]
    fn test_offline_validation_performance() {
        use super::super::offline::{OfflineCredentialState, OfflineValidator};

        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let creds = state.bridge.get_stored_credentials().unwrap();
        let offline_state = OfflineCredentialState::from_timestamp(creds.stored_at);

        let start = Instant::now();
        let _result = OfflineValidator::validate(&creds, &offline_state);
        let elapsed = start.elapsed();

        // NFR-CRED-6: Must complete within 100ms
        assert!(
            elapsed.as_millis() < 100,
            "Validation took {}ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn test_degraded_mode_full_access_for_new_credentials() {
        use super::super::offline::OfflineCredentialState;

        let state = CredentialState::new();
        state
            .bridge
            .store_credentials(create_test_credentials())
            .unwrap();

        let creds = state.bridge.get_stored_credentials().unwrap();
        let offline_state = OfflineCredentialState::from_timestamp(creds.stored_at);

        assert_eq!(
            offline_state.calculate_mode(),
            super::super::offline::DegradedMode::FullAccess
        );
    }

    #[test]
    fn test_degraded_mode_read_only_after_30_days() {
        use super::super::offline::{DegradedMode, OfflineCredentialState, SECONDS_PER_DAY};

        let now = get_current_timestamp();
        let old_timestamp = now - (31 * SECONDS_PER_DAY);

        let offline_state = OfflineCredentialState::from_timestamp(old_timestamp);
        assert_eq!(offline_state.calculate_mode(), DegradedMode::ReadOnly);
    }

    #[test]
    fn test_degraded_mode_requires_reauth_after_37_days() {
        use super::super::offline::{DegradedMode, OfflineCredentialState, SECONDS_PER_DAY};

        let now = get_current_timestamp();
        let old_timestamp = now - (38 * SECONDS_PER_DAY);

        let offline_state = OfflineCredentialState::from_timestamp(old_timestamp);
        assert_eq!(offline_state.calculate_mode(), DegradedMode::RequiresReauth);
    }

    #[test]
    fn test_refresh_result_serialization() {
        use super::super::refresh::RefreshResult;

        let result = RefreshResult::success();
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));

        let result = RefreshResult::requires_reauth("Token expired".to_string());
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"requires_reauth\":true"));
    }

    // ========== Story 5.5: Migration Command Tests (10 tests) ==========

    #[test]
    fn test_migration_manager_initialization() {
        use super::super::migration::MigrationStatus;

        let state = CredentialState::new();
        assert_eq!(state.migration.get_status(), MigrationStatus::Idle);
        assert!(state.migration.get_progress().is_none());
        assert!(state.migration.get_result().is_none());
    }

    #[test]
    fn test_start_session_migration() {
        use super::super::migration::{MigrationChoice, MigrationStatus};

        let state = CredentialState::new();
        let result = state
            .migration
            .start_migration(MigrationChoice::Merge, "user-123".to_string());

        assert!(result.is_ok());
        assert_eq!(state.migration.get_status(), MigrationStatus::InProgress);
    }

    #[test]
    fn test_start_migration_with_different_choices() {
        use super::super::migration::MigrationChoice;

        // Test KeepSeparate
        let state1 = CredentialState::new();
        let result = state1
            .migration
            .start_migration(MigrationChoice::KeepSeparate, "user-1".to_string());
        assert!(result.is_ok());
        assert_eq!(
            state1.migration.get_choice(),
            Some(MigrationChoice::KeepSeparate)
        );

        // Test Discard
        let state2 = CredentialState::new();
        let result = state2
            .migration
            .start_migration(MigrationChoice::Discard, "user-2".to_string());
        assert!(result.is_ok());
        assert_eq!(
            state2.migration.get_choice(),
            Some(MigrationChoice::Discard)
        );
    }

    #[test]
    fn test_get_migration_progress_no_migration() {
        let state = CredentialState::new();
        let progress = state.migration.get_progress();
        assert!(progress.is_none());
    }

    #[test]
    fn test_get_migration_progress_during_migration() {
        use super::super::migration::MigrationChoice;

        let state = CredentialState::new();
        state
            .migration
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let progress = state.migration.get_progress();
        assert!(progress.is_some());

        let p = progress.unwrap();
        assert_eq!(p.current, 0);
        assert_eq!(p.percentage, 0);
    }

    #[test]
    fn test_cancel_migration() {
        use super::super::migration::MigrationChoice;

        let state = CredentialState::new();
        state
            .migration
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = state.migration.cancel();
        assert!(result.is_ok());
        assert!(state.migration.is_cancel_requested());
    }

    #[test]
    fn test_cancel_migration_not_in_progress() {
        let state = CredentialState::new();
        let result = state.migration.cancel();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No migration in progress"));
    }

    #[test]
    fn test_reset_migration() {
        use super::super::migration::{MigrationChoice, MigrationStatus};

        let state = CredentialState::new();
        state
            .migration
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = state.migration.reset();
        assert!(result.is_ok());
        assert_eq!(state.migration.get_status(), MigrationStatus::Idle);
        assert!(state.migration.get_choice().is_none());
    }

    #[test]
    fn test_migration_user_id_tracking() {
        use super::super::migration::MigrationChoice;

        let state = CredentialState::new();
        state
            .migration
            .start_migration(MigrationChoice::Merge, "user-abc-123".to_string())
            .unwrap();

        assert_eq!(
            state.migration.get_user_id(),
            Some("user-abc-123".to_string())
        );
    }

    #[test]
    fn test_migration_choice_serialization_ipc() {
        use super::super::migration::MigrationChoice;

        // Verify IPC serialization format matches TypeScript expectations
        let merge = MigrationChoice::Merge;
        let json = serde_json::to_string(&merge).unwrap();
        assert_eq!(json, "\"merge\"");

        let keep = MigrationChoice::KeepSeparate;
        let json = serde_json::to_string(&keep).unwrap();
        assert_eq!(json, "\"keep-separate\"");

        let discard = MigrationChoice::Discard;
        let json = serde_json::to_string(&discard).unwrap();
        assert_eq!(json, "\"discard\"");
    }
}
