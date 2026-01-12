//! Offline authentication types and validation (Story 5.4)
//!
//! Provides offline credential validation and degraded mode handling.
//! Allows users to work offline with cached credentials for up to 30 days.
//!
//! # Security Architecture
//!
//! - Offline validation checks JWT structure locally (no network)
//! - 30-day offline validity window (FR-CRED-7)
//! - Graceful degradation to read-only after 30 days (FR-CRED-8)
//! - Performance target: < 100ms validation (NFR-CRED-6)
//!
//! # Story References
//! - Story 5.4: Offline Authentication
//!   - AC1: Offline authentication from cached credentials
//!   - AC2: Extended offline period (30 days)
//!   - AC3: Expired offline credentials (>30 days)
//!   - AC4: Offline validation performance

// Allow cast wrapping - timestamps are within valid range for application lifetime
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::cast_sign_loss)]

use serde::{Deserialize, Serialize};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use super::types::{CredentialError, StoredCredentials};

/// Offline validity constants (FR-CRED-7, FR-CRED-8)
pub const OFFLINE_VALIDITY_DAYS: i64 = 30;
pub const READ_ONLY_GRACE_DAYS: i64 = 7;
pub const SECONDS_PER_DAY: i64 = 86_400;

/// Degraded mode levels (AC3)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DegradedMode {
    /// Full access - within 30-day offline window
    FullAccess,
    /// Read-only access - 30-37 days offline
    ReadOnly,
    /// Must re-authenticate - > 37 days offline
    RequiresReauth,
}

/// Offline validation result (AC1, AC4)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineValidationResult {
    /// Whether credentials are valid for offline use
    pub is_valid: bool,
    /// When offline validity expires (Unix timestamp)
    pub expires_at: i64,
    /// Current degraded mode level
    pub mode: DegradedMode,
    /// Days remaining in offline window
    pub days_remaining: i64,
    /// Whether credentials need refresh when online
    pub needs_refresh: bool,
}

/// Offline credential state (stored alongside credentials)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineCredentialState {
    /// When credentials were originally stored (Unix timestamp)
    pub stored_at: i64,
    /// When offline validity expires (stored_at + 30 days)
    pub offline_valid_until: i64,
    /// Last time credentials were successfully refreshed
    pub last_refresh_at: Option<i64>,
    /// Last time offline validation was performed
    pub last_validation_at: Option<i64>,
}

impl OfflineCredentialState {
    /// Create new offline state from current time
    pub fn new() -> Self {
        let now = current_timestamp();

        Self {
            stored_at: now,
            offline_valid_until: now + (OFFLINE_VALIDITY_DAYS * SECONDS_PER_DAY),
            last_refresh_at: Some(now),
            last_validation_at: None,
        }
    }

    /// Create offline state from a specific timestamp
    #[allow(dead_code)]
    pub const fn from_timestamp(stored_at: i64) -> Self {
        Self {
            stored_at,
            offline_valid_until: stored_at + (OFFLINE_VALIDITY_DAYS * SECONDS_PER_DAY),
            last_refresh_at: Some(stored_at),
            last_validation_at: None,
        }
    }

    /// Calculate current degraded mode (AC3)
    pub fn calculate_mode(&self) -> DegradedMode {
        let now = current_timestamp();
        let grace_until = self.offline_valid_until + (READ_ONLY_GRACE_DAYS * SECONDS_PER_DAY);

        if now <= self.offline_valid_until {
            DegradedMode::FullAccess
        } else if now <= grace_until {
            DegradedMode::ReadOnly
        } else {
            DegradedMode::RequiresReauth
        }
    }

    /// Get days remaining in offline window
    pub fn days_remaining(&self) -> i64 {
        let now = current_timestamp();
        let remaining_seconds = self.offline_valid_until - now;
        remaining_seconds / SECONDS_PER_DAY
    }

    /// Check if offline credentials are still valid
    #[allow(dead_code)]
    pub fn is_valid(&self) -> bool {
        self.calculate_mode() != DegradedMode::RequiresReauth
    }

    /// Update the validation timestamp
    #[allow(dead_code)]
    pub fn mark_validated(&mut self) {
        self.last_validation_at = Some(current_timestamp());
    }

    /// Update the refresh timestamp (called after successful online refresh)
    #[allow(dead_code)]
    pub fn mark_refreshed(&mut self) {
        let now = current_timestamp();
        self.last_refresh_at = Some(now);
        // Reset offline validity window on refresh
        self.offline_valid_until = now + (OFFLINE_VALIDITY_DAYS * SECONDS_PER_DAY);
    }
}

impl Default for OfflineCredentialState {
    fn default() -> Self {
        Self::new()
    }
}

/// Offline credential validator (AC1, AC4)
///
/// Validates credentials locally without network access.
/// PERFORMANCE: Must complete within 100ms (NFR-CRED-6)
pub struct OfflineValidator;

impl OfflineValidator {
    /// Validate credentials offline (AC1, AC4)
    ///
    /// # Performance
    /// Target: < 100ms (NFR-CRED-6)
    ///
    /// # Arguments
    /// * `credentials` - The stored credentials to validate
    /// * `offline_state` - The offline state tracking expiry
    ///
    /// # Returns
    /// * `Ok(OfflineValidationResult)` - Validation result with mode
    /// * `Err(CredentialError)` - If validation fails
    pub fn validate(
        credentials: &StoredCredentials,
        offline_state: &OfflineCredentialState,
    ) -> Result<OfflineValidationResult, CredentialError> {
        let start = Instant::now();

        // Validate access token format (basic check, no network)
        if credentials.access_token.is_empty() {
            return Err(CredentialError::Invalid);
        }

        // Check JWT structure if it looks like a JWT
        if credentials.access_token.contains('.') {
            Self::validate_jwt_structure(&credentials.access_token)?;
        }

        // Calculate mode based on offline state
        let mode = offline_state.calculate_mode();
        let days_remaining = offline_state.days_remaining();

        // Determine if valid for offline use
        let is_valid = mode != DegradedMode::RequiresReauth;

        // Check if refresh needed when online (access token expired)
        let needs_refresh = credentials.expires_at.is_some_and(|expires_at| {
            let now = current_timestamp();
            now > expires_at
        });

        let elapsed = start.elapsed();

        // Performance assertion (NFR-CRED-6)
        debug_assert!(
            elapsed.as_millis() < 100,
            "Offline validation took {}ms, expected < 100ms",
            elapsed.as_millis()
        );

        Ok(OfflineValidationResult {
            is_valid,
            expires_at: offline_state.offline_valid_until,
            mode,
            days_remaining,
            needs_refresh,
        })
    }

    /// Validate JWT structure without network verification
    fn validate_jwt_structure(token: &str) -> Result<(), CredentialError> {
        let parts: Vec<&str> = token.split('.').collect();

        if parts.len() != 3 {
            return Err(CredentialError::Invalid);
        }

        // Validate each part is non-empty (basic structure check)
        for part in parts {
            if part.is_empty() {
                return Err(CredentialError::Invalid);
            }
        }

        Ok(())
    }
}

/// Get current Unix timestamp
fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod offline_tests {
    use super::*;

    // ========== Task 1.6: Unit tests for types (8 tests) ==========

    #[test]
    fn test_degraded_mode_serialization() {
        // Test FullAccess
        let mode = DegradedMode::FullAccess;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"FullAccess\"");

        // Test ReadOnly
        let mode = DegradedMode::ReadOnly;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"ReadOnly\"");

        // Test RequiresReauth
        let mode = DegradedMode::RequiresReauth;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"RequiresReauth\"");
    }

    #[test]
    fn test_offline_validation_result_serialization() {
        let result = OfflineValidationResult {
            is_valid: true,
            expires_at: 1_704_067_200,
            mode: DegradedMode::FullAccess,
            days_remaining: 28,
            needs_refresh: false,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"is_valid\":true"));
        assert!(json.contains("\"FullAccess\""));
        assert!(json.contains("\"days_remaining\":28"));
    }

    #[test]
    fn test_offline_credential_state_new() {
        let state = OfflineCredentialState::new();
        let now = current_timestamp();

        // stored_at should be approximately now
        assert!((state.stored_at - now).abs() < 2);

        // offline_valid_until should be 30 days from now
        let expected_validity = now + (OFFLINE_VALIDITY_DAYS * SECONDS_PER_DAY);
        assert!((state.offline_valid_until - expected_validity).abs() < 2);

        // Should have full access
        assert_eq!(state.calculate_mode(), DegradedMode::FullAccess);
    }

    #[test]
    fn test_full_access_within_30_days() {
        let state = OfflineCredentialState::new();
        assert_eq!(state.calculate_mode(), DegradedMode::FullAccess);
        assert!(state.is_valid());
        assert!(state.days_remaining() >= 29); // At least 29 days remaining
    }

    #[test]
    fn test_read_only_after_30_days() {
        let now = current_timestamp();
        let state = OfflineCredentialState {
            stored_at: now - (31 * SECONDS_PER_DAY),
            offline_valid_until: now - SECONDS_PER_DAY, // Expired 1 day ago
            last_refresh_at: None,
            last_validation_at: None,
        };

        assert_eq!(state.calculate_mode(), DegradedMode::ReadOnly);
        assert!(state.is_valid()); // Still valid in read-only mode
    }

    #[test]
    fn test_requires_reauth_after_37_days() {
        let now = current_timestamp();
        let state = OfflineCredentialState {
            stored_at: now - (38 * SECONDS_PER_DAY),
            offline_valid_until: now - (8 * SECONDS_PER_DAY), // Expired 8 days ago (beyond 7-day grace)
            last_refresh_at: None,
            last_validation_at: None,
        };

        assert_eq!(state.calculate_mode(), DegradedMode::RequiresReauth);
        assert!(!state.is_valid()); // No longer valid
    }

    #[test]
    fn test_days_remaining_calculation() {
        let now = current_timestamp();

        // Full 30 days remaining
        let state = OfflineCredentialState::new();
        assert!(state.days_remaining() >= 29);
        assert!(state.days_remaining() <= 30);

        // 15 days remaining
        let state = OfflineCredentialState {
            stored_at: now - (15 * SECONDS_PER_DAY),
            offline_valid_until: now + (15 * SECONDS_PER_DAY),
            last_refresh_at: None,
            last_validation_at: None,
        };
        assert!((state.days_remaining() - 15).abs() <= 1);

        // Expired (negative days)
        let state = OfflineCredentialState {
            stored_at: now - (35 * SECONDS_PER_DAY),
            offline_valid_until: now - (5 * SECONDS_PER_DAY),
            last_refresh_at: None,
            last_validation_at: None,
        };
        assert!(state.days_remaining() < 0);
    }

    #[test]
    fn test_mark_refreshed_resets_validity() {
        let now = current_timestamp();

        // Create state that's about to expire
        let mut state = OfflineCredentialState {
            stored_at: now - (29 * SECONDS_PER_DAY),
            offline_valid_until: now + SECONDS_PER_DAY, // Only 1 day left
            last_refresh_at: None,
            last_validation_at: None,
        };

        assert!(state.days_remaining() <= 1);

        // Refresh should reset the 30-day window
        state.mark_refreshed();

        assert!(state.days_remaining() >= 29);
        assert!(state.last_refresh_at.is_some());
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod validator_tests {
    use super::*;

    // ========== Task 2.6: Unit tests for validation (12 tests) ==========

    fn create_valid_jwt_credentials() -> StoredCredentials {
        StoredCredentials::new("header.payload.signature".to_string())
    }

    fn create_simple_token_credentials() -> StoredCredentials {
        StoredCredentials::new("simple_access_token".to_string())
    }

    #[test]
    fn test_validate_valid_credentials() {
        let credentials = create_valid_jwt_credentials();
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.mode, DegradedMode::FullAccess);
        assert!(result.days_remaining >= 29);
        assert!(!result.needs_refresh);
    }

    #[test]
    fn test_validate_simple_token() {
        // Non-JWT tokens should also be valid
        let credentials = create_simple_token_credentials();
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid);
        assert_eq!(result.mode, DegradedMode::FullAccess);
    }

    #[test]
    fn test_validate_empty_token() {
        let credentials = StoredCredentials::new(String::new());
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CredentialError::Invalid);
    }

    #[test]
    fn test_validate_invalid_jwt_structure() {
        // JWT with only 2 parts
        let credentials = StoredCredentials::new("header.payload".to_string());
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), CredentialError::Invalid);
    }

    #[test]
    fn test_validate_jwt_with_empty_parts() {
        // JWT with empty signature
        let credentials = StoredCredentials::new("header.payload.".to_string());
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state);

        assert!(result.is_err());
    }

    #[test]
    fn test_validate_expired_offline_returns_read_only() {
        let now = current_timestamp();
        let credentials = create_valid_jwt_credentials();

        let offline_state = OfflineCredentialState {
            stored_at: now - (31 * SECONDS_PER_DAY),
            offline_valid_until: now - SECONDS_PER_DAY,
            last_refresh_at: None,
            last_validation_at: None,
        };

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid); // Still valid in read-only
        assert_eq!(result.mode, DegradedMode::ReadOnly);
    }

    #[test]
    fn test_validate_requires_reauth_returns_invalid() {
        let now = current_timestamp();
        let credentials = create_valid_jwt_credentials();

        let offline_state = OfflineCredentialState {
            stored_at: now - (40 * SECONDS_PER_DAY),
            offline_valid_until: now - (10 * SECONDS_PER_DAY),
            last_refresh_at: None,
            last_validation_at: None,
        };

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(!result.is_valid);
        assert_eq!(result.mode, DegradedMode::RequiresReauth);
    }

    #[test]
    fn test_validate_needs_refresh_when_token_expired() {
        let now = current_timestamp();

        let credentials =
            StoredCredentials::new("header.payload.signature".to_string()).with_expiry(now - 3600); // Expired 1 hour ago

        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid); // Still valid for offline use
        assert!(result.needs_refresh); // But needs refresh when online
    }

    #[test]
    fn test_validate_no_refresh_needed_when_token_not_expired() {
        let now = current_timestamp();

        let credentials =
            StoredCredentials::new("header.payload.signature".to_string()).with_expiry(now + 3600); // Expires in 1 hour

        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid);
        assert!(!result.needs_refresh);
    }

    #[test]
    fn test_validate_no_expiry_no_refresh_needed() {
        let credentials = StoredCredentials::new("header.payload.signature".to_string());
        // No expiry set
        let offline_state = OfflineCredentialState::new();

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert!(result.is_valid);
        assert!(!result.needs_refresh);
    }

    #[test]
    fn test_validation_performance() {
        let credentials = create_valid_jwt_credentials();
        let offline_state = OfflineCredentialState::new();

        let start = Instant::now();
        let result = OfflineValidator::validate(&credentials, &offline_state);
        let elapsed = start.elapsed();

        assert!(result.is_ok());
        // NFR-CRED-6: Must complete within 100ms
        assert!(
            elapsed.as_millis() < 100,
            "Validation took {}ms, expected < 100ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn test_validation_result_expires_at_matches_offline_state() {
        let now = current_timestamp();
        let offline_valid_until = now + (15 * SECONDS_PER_DAY);

        let credentials = create_valid_jwt_credentials();
        let offline_state = OfflineCredentialState {
            stored_at: now - (15 * SECONDS_PER_DAY),
            offline_valid_until,
            last_refresh_at: None,
            last_validation_at: None,
        };

        let result = OfflineValidator::validate(&credentials, &offline_state).unwrap();

        assert_eq!(result.expires_at, offline_valid_until);
    }
}
