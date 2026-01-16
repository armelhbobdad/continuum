//! Storage tier types for credential storage (Story 5.2)
//!
//! Defines the three-tier storage hierarchy:
//! - Tier 1: OS Keychain (highest security) - Windows Cred Mgr / macOS Keychain / Linux libsecret
//! - Tier 2: Stronghold (good security) - Encrypted vault
//! - Tier 3: Memory Only (fallback) - Session-only, no persistence
//!
//! # Story References
//! - Story 5.2: OS Keychain Integration
//! - AC1-3: Platform-specific keychain backends
//! - AC4: Stronghold fallback
//! - AC5: Memory-only last resort
//! - AC6: Storage tier indicator

use serde::{Deserialize, Serialize};

/// Storage tier for credentials (AC1-5)
///
/// Represents the current storage backend being used for credentials.
/// The tier indicates both the security level and persistence capabilities.
///
/// Default is `MemoryOnly` as the safest fallback. Actual tier will be
/// determined by `StorageManager` detection during initialization.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
pub enum StorageTier {
    /// OS Keychain (highest security)
    /// - Windows: Credential Manager
    /// - macOS: Keychain
    /// - Linux: Secret Service (libsecret)
    Keychain,
    /// Stronghold encrypted vault (good security)
    /// - Encrypted file storage
    /// - Password-derived key
    Stronghold,
    /// Memory only (session-only, last resort)
    /// - No persistence across restarts
    /// - Warning displayed to user (AC5)
    #[default]
    MemoryOnly,
}

/// Security level for display purposes (AC6)
///
/// Indicates how secure the current storage tier is.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SecurityLevel {
    /// Highest - OS-managed, hardware-backed where available
    Highest,
    /// Good - Encrypted file, app-managed
    Good,
    /// Limited - Session-only, no persistence
    Limited,
}

/// Storage info for UI display (AC6)
///
/// Contains all information needed to display the current storage
/// tier status in the settings UI.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StorageInfo {
    /// Current storage tier
    pub tier: StorageTier,
    /// Human-readable name for display
    pub display_name: String,
    /// Security level indicator
    pub security_level: SecurityLevel,
    /// Detailed description for tooltip/help text
    pub description: String,
    /// Whether credentials persist across app restarts
    pub persists_on_restart: bool,
}

impl StorageTier {
    /// Get storage info for this tier (AC6)
    ///
    /// Returns detailed information about the storage tier
    /// suitable for display in the UI.
    #[must_use]
    pub fn info(self) -> StorageInfo {
        match self {
            Self::Keychain => StorageInfo {
                tier: self,
                display_name: "OS Keychain".to_string(),
                security_level: SecurityLevel::Highest,
                description: "Your credentials are protected by your operating system's secure keychain. This provides the highest level of security with hardware-backed encryption where available.".to_string(),
                persists_on_restart: true,
            },
            Self::Stronghold => StorageInfo {
                tier: self,
                display_name: "Encrypted Vault".to_string(),
                security_level: SecurityLevel::Good,
                description: "Your credentials are stored in an encrypted vault on your device. This provides good security but is managed by Continuum rather than your operating system.".to_string(),
                persists_on_restart: true,
            },
            Self::MemoryOnly => StorageInfo {
                tier: self,
                display_name: "Memory Only".to_string(),
                security_level: SecurityLevel::Limited,
                description: "Your credentials are stored in memory only and will be lost when you close the app. This is a fallback mode - consider checking your system's keychain configuration.".to_string(),
                persists_on_restart: false,
            },
        }
    }
}

impl std::fmt::Display for StorageTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Keychain => write!(f, "OS Keychain"),
            Self::Stronghold => write!(f, "Encrypted Vault"),
            Self::MemoryOnly => write!(f, "Memory Only"),
        }
    }
}

impl std::fmt::Display for SecurityLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Highest => write!(f, "Highest"),
            Self::Good => write!(f, "Good"),
            Self::Limited => write!(f, "Limited"),
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_tier_serialization() {
        // Test that StorageTier serializes correctly for IPC (2.4)
        let tier = StorageTier::Keychain;
        let json = serde_json::to_string(&tier).unwrap();
        assert_eq!(json, "\"Keychain\"");

        let tier = StorageTier::Stronghold;
        let json = serde_json::to_string(&tier).unwrap();
        assert_eq!(json, "\"Stronghold\"");

        let tier = StorageTier::MemoryOnly;
        let json = serde_json::to_string(&tier).unwrap();
        assert_eq!(json, "\"MemoryOnly\"");
    }

    #[test]
    fn test_storage_tier_info() {
        // Test Keychain tier info
        let info = StorageTier::Keychain.info();
        assert_eq!(info.tier, StorageTier::Keychain);
        assert_eq!(info.display_name, "OS Keychain");
        assert_eq!(info.security_level, SecurityLevel::Highest);
        assert!(info.persists_on_restart);

        // Test Stronghold tier info
        let info = StorageTier::Stronghold.info();
        assert_eq!(info.tier, StorageTier::Stronghold);
        assert_eq!(info.display_name, "Encrypted Vault");
        assert_eq!(info.security_level, SecurityLevel::Good);
        assert!(info.persists_on_restart);

        // Test MemoryOnly tier info
        let info = StorageTier::MemoryOnly.info();
        assert_eq!(info.tier, StorageTier::MemoryOnly);
        assert_eq!(info.display_name, "Memory Only");
        assert_eq!(info.security_level, SecurityLevel::Limited);
        assert!(!info.persists_on_restart);
    }

    #[test]
    fn test_storage_info_serialization() {
        // Test that StorageInfo serializes correctly for IPC (2.4)
        let info = StorageTier::Keychain.info();
        let json = serde_json::to_string(&info).unwrap();

        // Verify key fields are present
        assert!(json.contains("\"tier\":\"Keychain\""));
        assert!(json.contains("\"display_name\":\"OS Keychain\""));
        assert!(json.contains("\"security_level\":\"Highest\""));
        assert!(json.contains("\"persists_on_restart\":true"));

        // Verify we can deserialize back
        let deserialized: StorageInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, info);
    }
}
