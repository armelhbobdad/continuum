//! Memory-only credential backend (Story 5.2)
//!
//! Provides session-only credential storage as a last resort fallback.
//! Credentials are stored in memory and lost when the app closes.
//!
//! # Warning
//!
//! This backend is the fallback of last resort (AC5). Users should be
//! prominently warned that credentials will not persist across app restarts.
//!
//! # Story References
//! - Story 5.2: OS Keychain Integration
//! - AC5: Memory-only last resort with prominent warning

use super::storage::StorageTier;
use super::types::CredentialError;
use std::collections::HashMap;
use std::sync::Mutex;

/// Memory-only credential backend (AC5)
///
/// This is the fallback of last resort when neither OS keychain
/// nor Stronghold are available.
///
/// # Security Warning
///
/// - Credentials are NOT persisted to disk
/// - All credentials are lost when the app closes
/// - Users MUST be warned about this limitation (NFR-CRED-8)
///
/// # Thread Safety
///
/// Uses `Mutex<HashMap>` for thread-safe access.
pub struct MemoryBackend {
    /// In-memory credential storage
    storage: Mutex<HashMap<String, String>>,
}

impl MemoryBackend {
    /// Create a new memory backend
    ///
    /// # Note
    ///
    /// The memory backend is always available since it has no
    /// external dependencies.
    #[must_use]
    pub fn new() -> Self {
        Self {
            storage: Mutex::new(HashMap::new()),
        }
    }

    /// Store a credential in memory
    ///
    /// # Arguments
    ///
    /// * `key` - Unique identifier for this credential
    /// * `value` - The secret value to store
    ///
    /// # Warning
    ///
    /// This credential will be lost when the app closes.
    pub fn store(&self, key: &str, value: &str) -> Result<(), CredentialError> {
        let mut storage = self
            .storage
            .lock()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        storage.insert(key.to_string(), value.to_string());
        Ok(())
    }

    /// Retrieve a credential from memory
    ///
    /// # Arguments
    ///
    /// * `key` - Unique identifier for the credential
    ///
    /// # Returns
    ///
    /// - `Ok(Some(value))` if the credential exists
    /// - `Ok(None)` if no credential is stored for this key
    #[allow(dead_code)] // Used via CredentialBackend trait
    pub fn retrieve(&self, key: &str) -> Result<Option<String>, CredentialError> {
        let storage = self
            .storage
            .lock()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        Ok(storage.get(key).cloned())
    }

    /// Delete a credential from memory (secure wipe)
    ///
    /// # Arguments
    ///
    /// * `key` - Unique identifier for the credential to delete
    ///
    /// # Security
    ///
    /// The credential is removed from the HashMap. Rust's memory
    /// allocator will handle the actual memory, but the credential
    /// is immediately inaccessible.
    pub fn delete(&self, key: &str) -> Result<(), CredentialError> {
        let mut storage = self
            .storage
            .lock()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        storage.remove(key);
        Ok(())
    }

    /// Check if the memory backend is available
    ///
    /// Always returns `true` since memory storage has no dependencies.
    #[must_use]
    #[allow(dead_code)] // Used via CredentialBackend trait
    #[allow(clippy::unused_self)] // Required by CredentialBackend trait
    pub const fn is_available(&self) -> bool {
        true
    }

    /// Get the storage tier for this backend
    #[must_use]
    #[allow(dead_code)] // Used via CredentialBackend trait
    #[allow(clippy::unused_self)] // Required by CredentialBackend trait
    pub const fn tier(&self) -> StorageTier {
        StorageTier::MemoryOnly
    }

    /// Get the number of stored credentials
    ///
    /// Useful for diagnostics and testing.
    #[allow(dead_code)] // May be used for diagnostics
    pub fn count(&self) -> Result<usize, CredentialError> {
        let storage = self
            .storage
            .lock()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        Ok(storage.len())
    }

    /// Clear all stored credentials
    ///
    /// # Security
    ///
    /// Removes all credentials from memory. Use with caution.
    #[allow(dead_code)] // May be used for bulk clear operations
    pub fn clear(&self) -> Result<(), CredentialError> {
        let mut storage = self
            .storage
            .lock()
            .map_err(|e| CredentialError::InternalError(format!("Lock error: {e}")))?;
        storage.clear();
        Ok(())
    }
}

impl Default for MemoryBackend {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_backend_creation() {
        let backend = MemoryBackend::new();
        assert!(backend.is_available());
    }

    #[test]
    fn test_memory_tier() {
        let backend = MemoryBackend::new();
        assert_eq!(backend.tier(), StorageTier::MemoryOnly);
    }

    #[test]
    fn test_memory_store_and_retrieve() {
        let backend = MemoryBackend::new();

        // Store
        let result = backend.store("test_key", "test_value");
        assert!(result.is_ok());

        // Retrieve
        let retrieved = backend.retrieve("test_key");
        assert!(retrieved.is_ok());
        assert_eq!(retrieved.unwrap(), Some("test_value".to_string()));
    }

    #[test]
    fn test_memory_retrieve_nonexistent() {
        let backend = MemoryBackend::new();

        let result = backend.retrieve("nonexistent_key");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    fn test_memory_delete() {
        let backend = MemoryBackend::new();

        // Store first
        backend.store("key_to_delete", "value").unwrap();

        // Delete
        let result = backend.delete("key_to_delete");
        assert!(result.is_ok());

        // Verify deleted
        let retrieved = backend.retrieve("key_to_delete");
        assert_eq!(retrieved.unwrap(), None);
    }
}
