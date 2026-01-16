//! Credential storage backend trait and manager (Story 5.2)
//!
//! Defines the common interface for all storage backends and provides
//! the `StorageManager` that handles automatic fallback between tiers:
//! 1. OS Keychain (highest security)
//! 2. Stronghold (good security)
//! 3. Memory-only (last resort)
//!
//! # Story References
//! - Story 5.2: OS Keychain Integration
//! - AC1-5: Three-tier storage with automatic fallback

use super::keychain::KeychainBackend;
use super::memory::MemoryBackend;
use super::storage::{StorageInfo, StorageTier};
use super::stronghold::StrongholdBackend;
use super::types::CredentialError;
use std::path::PathBuf;
use std::sync::RwLock;

/// Credential backend trait
///
/// Defines the common interface for all credential storage backends.
/// Each backend must implement store, retrieve, delete operations
/// and report its availability and tier.
///
/// Note: Not all trait methods are used in the current implementation,
/// but they are part of the API for completeness and future use.
#[allow(dead_code)]
pub trait CredentialBackend: Send + Sync {
    /// Store a credential
    fn store(&self, key: &str, value: &str) -> Result<(), CredentialError>;

    /// Retrieve a credential
    fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError>;

    /// Delete a credential
    fn delete(&self, key: &str) -> Result<(), CredentialError>;

    /// Check if this backend is available
    fn is_available(&self) -> bool;

    /// Get the storage tier
    fn tier(&self) -> StorageTier;
}

// Implement CredentialBackend for KeychainBackend
impl CredentialBackend for KeychainBackend {
    fn store(&self, key: &str, value: &str) -> Result<(), CredentialError> {
        Self::store(self, key, value)
    }

    fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError> {
        Self::retrieve(self, key)
    }

    fn delete(&self, key: &str) -> Result<(), CredentialError> {
        Self::delete(self, key)
    }

    fn is_available(&self) -> bool {
        Self::is_available(self)
    }

    fn tier(&self) -> StorageTier {
        Self::tier(self)
    }
}

// Implement CredentialBackend for StrongholdBackend
impl CredentialBackend for StrongholdBackend {
    fn store(&self, key: &str, value: &str) -> Result<(), CredentialError> {
        Self::store(self, key, value)
    }

    fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError> {
        Self::retrieve(self, key)
    }

    fn delete(&self, key: &str) -> Result<(), CredentialError> {
        Self::delete(self, key)
    }

    fn is_available(&self) -> bool {
        Self::is_available(self)
    }

    fn tier(&self) -> StorageTier {
        Self::tier(self)
    }
}

// Implement CredentialBackend for MemoryBackend
impl CredentialBackend for MemoryBackend {
    fn store(&self, key: &str, value: &str) -> Result<(), CredentialError> {
        Self::store(self, key, value)
    }

    fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError> {
        Self::retrieve(self, key)
    }

    fn delete(&self, key: &str) -> Result<(), CredentialError> {
        Self::delete(self, key)
    }

    fn is_available(&self) -> bool {
        Self::is_available(self)
    }

    fn tier(&self) -> StorageTier {
        Self::tier(self)
    }
}

/// Storage backend enum for type-safe backend management
enum Backend {
    Keychain(KeychainBackend),
    Stronghold(StrongholdBackend),
    Memory(MemoryBackend),
}

impl Backend {
    fn as_trait(&self) -> &dyn CredentialBackend {
        match self {
            Self::Keychain(b) => b,
            Self::Stronghold(b) => b,
            Self::Memory(b) => b,
        }
    }
}

/// Storage manager with automatic fallback (AC1-5)
///
/// Manages credential storage across the three-tier hierarchy:
/// 1. **Keychain** - OS-managed (Windows Cred Mgr / macOS Keychain / Linux libsecret)
/// 2. **Stronghold** - Encrypted vault file
/// 3. **Memory** - Session-only (last resort)
///
/// The manager automatically detects the highest available tier
/// during initialization and uses it for all operations.
///
/// # Thread Safety
///
/// Uses `RwLock` for concurrent read access with exclusive write access.
pub struct StorageManager {
    /// Active storage backend
    backend: RwLock<Backend>,
    /// Current storage tier
    current_tier: RwLock<StorageTier>,
}

impl StorageManager {
    /// Create a new storage manager with automatic tier detection
    ///
    /// # Arguments
    ///
    /// * `app_data_dir` - Optional path to app data directory for Stronghold vault
    ///
    /// # Tier Detection Order
    ///
    /// 1. Try Keychain backend
    /// 2. If unavailable, try Stronghold backend
    /// 3. If unavailable, use Memory backend (always available)
    #[must_use]
    pub fn new(app_data_dir: Option<PathBuf>) -> Self {
        // Try Keychain first (highest security)
        let keychain = KeychainBackend::new();
        if keychain.is_available() {
            // Test if keychain actually works by attempting a probe
            // Some systems report available but operations fail
            let probe_key = "_continuum_probe_test";
            if keychain.store(probe_key, "test").is_ok() {
                // Clean up probe
                let _ = keychain.delete(probe_key);
                return Self {
                    backend: RwLock::new(Backend::Keychain(keychain)),
                    current_tier: RwLock::new(StorageTier::Keychain),
                };
            }
        }

        // Try Stronghold second (good security)
        let stronghold = StrongholdBackend::new(app_data_dir);
        if stronghold.is_available() {
            return Self {
                backend: RwLock::new(Backend::Stronghold(stronghold)),
                current_tier: RwLock::new(StorageTier::Stronghold),
            };
        }

        // Fall back to Memory (last resort)
        Self {
            backend: RwLock::new(Backend::Memory(MemoryBackend::new())),
            current_tier: RwLock::new(StorageTier::MemoryOnly),
        }
    }

    /// Create a storage manager with a specific tier (for testing)
    ///
    /// # Arguments
    ///
    /// * `tier` - The specific tier to use
    /// * `app_data_dir` - Optional path to app data directory
    #[cfg(test)]
    pub fn with_tier(tier: StorageTier, app_data_dir: Option<PathBuf>) -> Self {
        let backend = match tier {
            StorageTier::Keychain => Backend::Keychain(KeychainBackend::new()),
            StorageTier::Stronghold => Backend::Stronghold(StrongholdBackend::new(app_data_dir)),
            StorageTier::MemoryOnly => Backend::Memory(MemoryBackend::new()),
        };

        Self {
            backend: RwLock::new(backend),
            current_tier: RwLock::new(tier),
        }
    }

    /// Get the current storage tier
    #[must_use]
    pub fn current_tier(&self) -> StorageTier {
        *self
            .current_tier
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Get storage info for UI display (AC6)
    #[must_use]
    pub fn storage_info(&self) -> StorageInfo {
        self.current_tier().info()
    }

    /// Store a credential
    pub fn store(&self, key: &str, value: &str) -> Result<(), CredentialError> {
        let backend = self
            .backend
            .read()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        backend.as_trait().store(key, value)
    }

    /// Retrieve a credential
    pub fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError> {
        let backend = self
            .backend
            .read()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        backend.as_trait().retrieve(key)
    }

    /// Delete a credential
    pub fn delete(&self, key: &str) -> Result<(), CredentialError> {
        let backend = self
            .backend
            .read()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        backend.as_trait().delete(key)
    }

    /// Check if the current backend is available
    #[must_use]
    #[allow(dead_code)] // May be used for diagnostics
    pub fn is_available(&self) -> bool {
        let backend = self
            .backend
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        backend.as_trait().is_available()
    }

    /// Detect and return the available tier without switching
    ///
    /// Useful for diagnostics.
    #[must_use]
    #[allow(dead_code)] // May be used for diagnostics
    pub fn detect_available_tier(app_data_dir: Option<PathBuf>) -> StorageTier {
        // Try Keychain
        let keychain = KeychainBackend::new();
        if keychain.is_available() {
            let probe_key = "_continuum_probe_detect";
            if keychain.store(probe_key, "test").is_ok() {
                let _ = keychain.delete(probe_key);
                return StorageTier::Keychain;
            }
        }

        // Try Stronghold
        let stronghold = StrongholdBackend::new(app_data_dir);
        if stronghold.is_available() {
            return StorageTier::Stronghold;
        }

        // Memory is always available
        StorageTier::MemoryOnly
    }
}

impl Default for StorageManager {
    fn default() -> Self {
        Self::new(None)
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_manager_creation() {
        let manager = StorageManager::new(None);
        // Should have detected some tier
        let tier = manager.current_tier();
        assert!(matches!(
            tier,
            StorageTier::Keychain | StorageTier::Stronghold | StorageTier::MemoryOnly
        ));
    }

    #[test]
    fn test_storage_manager_info() {
        let manager = StorageManager::new(None);
        let info = manager.storage_info();

        // Info should match current tier
        assert_eq!(info.tier, manager.current_tier());
        assert!(!info.display_name.is_empty());
        assert!(!info.description.is_empty());
    }

    #[test]
    fn test_storage_manager_store_retrieve() {
        let manager = StorageManager::with_tier(StorageTier::MemoryOnly, None);

        // Store
        let result = manager.store("test_key", "test_value");
        assert!(result.is_ok());

        // Retrieve
        let retrieved = manager.retrieve("test_key");
        assert!(retrieved.is_ok());
        assert_eq!(retrieved.unwrap(), Some("test_value".to_string()));
    }

    #[test]
    fn test_storage_manager_delete() {
        let manager = StorageManager::with_tier(StorageTier::MemoryOnly, None);

        // Store
        manager.store("key_to_delete", "value").unwrap();

        // Delete
        let result = manager.delete("key_to_delete");
        assert!(result.is_ok());

        // Verify deleted
        let retrieved = manager.retrieve("key_to_delete");
        assert_eq!(retrieved.unwrap(), None);
    }

    #[test]
    fn test_storage_manager_with_stronghold_tier() {
        let manager = StorageManager::with_tier(StorageTier::Stronghold, None);
        assert_eq!(manager.current_tier(), StorageTier::Stronghold);

        // Operations should work
        manager.store("stronghold_key", "stronghold_value").unwrap();
        let retrieved = manager.retrieve("stronghold_key");
        assert_eq!(retrieved.unwrap(), Some("stronghold_value".to_string()));
    }

    #[test]
    fn test_storage_manager_with_memory_tier() {
        let manager = StorageManager::with_tier(StorageTier::MemoryOnly, None);
        assert_eq!(manager.current_tier(), StorageTier::MemoryOnly);

        // Operations should work
        manager.store("memory_key", "memory_value").unwrap();
        let retrieved = manager.retrieve("memory_key");
        assert_eq!(retrieved.unwrap(), Some("memory_value".to_string()));
    }

    #[test]
    fn test_detect_available_tier() {
        let tier = StorageManager::detect_available_tier(None);
        // Should always return a valid tier
        assert!(matches!(
            tier,
            StorageTier::Keychain | StorageTier::Stronghold | StorageTier::MemoryOnly
        ));
    }

    #[test]
    fn test_storage_manager_is_available() {
        let manager = StorageManager::with_tier(StorageTier::MemoryOnly, None);
        assert!(manager.is_available());
    }

    #[test]
    fn test_storage_manager_retrieve_nonexistent() {
        let manager = StorageManager::with_tier(StorageTier::MemoryOnly, None);

        let result = manager.retrieve("nonexistent_key");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }
}
