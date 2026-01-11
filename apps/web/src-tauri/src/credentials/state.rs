//! Credential state management for Tauri (Story 5.1)
//!
//! Provides thread-safe credential state that can be managed by Tauri.
//!
//! # Performance Requirements
//! - NFR-CRED-2: Credential availability check must complete within 500ms on cold start

use super::bridge::CredentialBridge;

/// Credential state managed by Tauri (AC1, AC4)
///
/// This struct wraps the CredentialBridge for Tauri's state management system.
/// It is initialized once at app startup and shared across all commands.
pub struct CredentialState {
    /// The credential bridge for secure credential operations
    pub bridge: CredentialBridge,
}

impl CredentialState {
    /// Create a new credential state with empty credentials
    ///
    /// Performance: This initialization is part of app startup
    /// and contributes to the cold start timing (NFR-CRED-2).
    pub fn new() -> Self {
        Self {
            bridge: CredentialBridge::new(),
        }
    }

    /// Check if credentials are available (fast check) (AC4)
    ///
    /// This is a lightweight check that should complete quickly.
    /// Used during app initialization to determine auth state.
    ///
    /// # Performance
    /// Target: < 500ms on cold start (NFR-CRED-2)
    /// Note: Used in tests; command uses bridge.check_availability() directly
    #[allow(dead_code)]
    pub fn check_availability(&self) -> bool {
        self.bridge.check_availability()
    }
}

impl Default for CredentialState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod state_tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_credential_state_creation() {
        let state = CredentialState::new();
        assert!(!state.bridge.check_availability());
    }

    #[test]
    fn test_credential_state_default() {
        let state = CredentialState::default();
        assert!(!state.check_availability());
    }

    #[test]
    fn test_cold_start_performance() {
        // NFR-CRED-2: Check must complete within 500ms
        let start = Instant::now();

        let state = CredentialState::new();
        let _available = state.check_availability();

        let elapsed = start.elapsed();

        // Allow generous margin for CI variability (50ms in practice)
        assert!(
            elapsed.as_millis() < 500,
            "Cold start check took {}ms, expected < 500ms",
            elapsed.as_millis()
        );
    }
}
