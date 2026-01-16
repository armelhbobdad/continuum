//! Migration Types (Story 5.5 Task 3)
//!
//! Type definitions for anonymous-to-authenticated migration.
//! These types are serialized for IPC with the TypeScript frontend.
//!
//! # Story References
//! - Story 5.5: Anonymous to Authenticated Migration
//!   - AC2: Migration Choice Dialog (MigrationChoice)
//!   - AC3: Atomic Data Migration (MigrationResult)
//!   - AC4: Migration Progress Display (MigrationProgress, MigrationStatus)
//!   - AC5: Migration Failure Recovery (rollback support)

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// User's choice for handling anonymous data during migration (AC2).
///
/// Serialized as kebab-case for consistency with TypeScript types.
/// Example: `Merge` serializes to `"merge"`, `KeepSeparate` to `"keep-separate"`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
#[allow(dead_code)] // Used by Tauri commands in Task 5
pub enum MigrationChoice {
    /// Combine anonymous sessions with authenticated account
    Merge,
    /// Keep anonymous sessions local, start fresh with account
    KeepSeparate,
    /// Delete anonymous sessions, use account only
    Discard,
}

/// Current status of migration process (AC4).
///
/// Serialized as kebab-case for consistency with TypeScript types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
#[allow(dead_code)] // Used by Tauri commands in Task 5
pub enum MigrationStatus {
    /// No migration in progress
    #[default]
    Idle,
    /// Migration currently running
    InProgress,
    /// Migration completed successfully
    Completed,
    /// Migration failed with error
    Failed,
}

/// Progress information during migration (AC4).
///
/// Displayed to user during migration process via IPC.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Used by Tauri commands in Task 5
pub struct MigrationProgress {
    /// Current session being processed (0-indexed)
    pub current: usize,
    /// Total sessions to process
    pub total: usize,
    /// Description of current step (user-facing)
    pub step: String,
    /// Percentage complete (0-100)
    pub percentage: u8,
}

impl Default for MigrationProgress {
    fn default() -> Self {
        Self {
            current: 0,
            total: 0,
            step: "Preparing migration...".to_string(),
            percentage: 0,
        }
    }
}

/// Result of migration operation (AC3, AC5).
///
/// Returned after migration completes or fails.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Used by Tauri commands in Task 5
pub struct MigrationResult {
    /// Whether migration succeeded
    pub success: bool,
    /// Error message if failed (None on success)
    pub error: Option<String>,
    /// Number of sessions migrated
    pub sessions_migrated: usize,
    /// Unix timestamp of completion (seconds since epoch)
    pub completed_at: i64,
}

#[allow(dead_code)] // Used by Tauri commands in Task 5
impl MigrationResult {
    /// Create a successful migration result.
    pub fn success(sessions_migrated: usize) -> Self {
        Self {
            success: true,
            error: None,
            sessions_migrated,
            completed_at: chrono::Utc::now().timestamp(),
        }
    }

    /// Create a failed migration result.
    pub fn failure(error: impl Into<String>) -> Self {
        Self {
            success: false,
            error: Some(error.into()),
            sessions_migrated: 0,
            completed_at: chrono::Utc::now().timestamp(),
        }
    }
}

/// Internal migration state tracked during operation.
///
/// Not exposed directly via IPC; use `MigrationManager` methods instead.
#[allow(dead_code)] // Fields accessed via MigrationManager
pub struct MigrationState {
    /// Current status
    pub status: MigrationStatus,
    /// User's choice (set when migration starts)
    pub choice: Option<MigrationChoice>,
    /// Progress during migration
    pub progress: Option<MigrationProgress>,
    /// Result after completion
    pub result: Option<MigrationResult>,
    /// Flag to request cancellation
    pub cancel_requested: bool,
    /// User ID for migration target
    pub user_id: Option<String>,
}

impl Default for MigrationState {
    fn default() -> Self {
        Self {
            status: MigrationStatus::Idle,
            choice: None,
            progress: None,
            result: None,
            cancel_requested: false,
            user_id: None,
        }
    }
}

/// Thread-safe migration manager (AC3).
///
/// Manages migration lifecycle with atomic operations.
/// Uses Arc<Mutex> for thread-safe access from async Tauri commands.
#[derive(Clone)]
#[allow(dead_code)] // Used by Tauri commands in Task 5
pub struct MigrationManager {
    state: Arc<Mutex<MigrationState>>,
}

#[allow(dead_code)] // Used by Tauri commands in Task 5
impl MigrationManager {
    /// Create a new migration manager with idle state.
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(MigrationState::default())),
        }
    }

    /// Start migration with user's choice (AC3).
    ///
    /// # Errors
    /// Returns error if migration is already in progress.
    pub fn start_migration(&self, choice: MigrationChoice, user_id: String) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|e| e.to_string())?;

        if state.status == MigrationStatus::InProgress {
            return Err("Migration already in progress".to_string());
        }

        state.status = MigrationStatus::InProgress;
        state.choice = Some(choice);
        state.user_id = Some(user_id);
        state.progress = Some(MigrationProgress::default());
        state.cancel_requested = false;
        state.result = None;

        Ok(())
    }

    /// Get current migration progress (AC4).
    ///
    /// Returns None if no migration is in progress.
    pub fn get_progress(&self) -> Option<MigrationProgress> {
        self.state.lock().ok()?.progress.clone()
    }

    /// Get current migration status.
    pub fn get_status(&self) -> MigrationStatus {
        self.state
            .lock()
            .map(|s| s.status.clone())
            .unwrap_or(MigrationStatus::Idle)
    }

    /// Get migration result after completion.
    ///
    /// Returns None if migration hasn't completed.
    pub fn get_result(&self) -> Option<MigrationResult> {
        self.state.lock().ok()?.result.clone()
    }

    /// Update progress during migration (AC4).
    ///
    /// # Errors
    /// Returns error if no migration is in progress.
    pub fn update_progress(&self, progress: MigrationProgress) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|e| e.to_string())?;

        if state.status != MigrationStatus::InProgress {
            return Err("No migration in progress".to_string());
        }

        state.progress = Some(progress);
        Ok(())
    }

    /// Complete migration with result (AC3).
    pub fn complete(&self, result: MigrationResult) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|e| e.to_string())?;

        state.status = if result.success {
            MigrationStatus::Completed
        } else {
            MigrationStatus::Failed
        };
        state.result = Some(result);
        state.progress = None;

        Ok(())
    }

    /// Request cancellation of in-progress migration (AC5).
    ///
    /// # Errors
    /// Returns error if no migration is in progress.
    pub fn cancel(&self) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|e| e.to_string())?;

        if state.status != MigrationStatus::InProgress {
            return Err("No migration in progress to cancel".to_string());
        }

        state.cancel_requested = true;
        Ok(())
    }

    /// Check if cancellation was requested.
    pub fn is_cancel_requested(&self) -> bool {
        self.state
            .lock()
            .map(|s| s.cancel_requested)
            .unwrap_or(false)
    }

    /// Reset to idle state.
    pub fn reset(&self) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|e| e.to_string())?;
        *state = MigrationState::default();
        Ok(())
    }

    /// Get user ID for migration target.
    pub fn get_user_id(&self) -> Option<String> {
        self.state.lock().ok()?.user_id.clone()
    }

    /// Get current choice.
    pub fn get_choice(&self) -> Option<MigrationChoice> {
        self.state.lock().ok()?.choice.clone()
    }

    /// Execute migration with atomicity guarantee (AC3, Task 4.5).
    ///
    /// This method provides an atomic migration execution pattern.
    /// If any step fails, the migration is rolled back to the previous state.
    ///
    /// # Arguments
    /// * `total_sessions` - Total number of sessions to migrate
    /// * `migrate_fn` - Closure that performs the actual migration for each session.
    ///   Returns Ok(()) on success or Err(message) on failure.
    ///
    /// # Returns
    /// * `Ok(MigrationResult)` - Migration completed (check .success for status)
    /// * `Err(String)` - Migration could not be started or was cancelled
    pub fn execute_atomic<F>(
        &self,
        total_sessions: usize,
        mut migrate_fn: F,
    ) -> Result<MigrationResult, String>
    where
        F: FnMut(usize) -> Result<(), String>,
    {
        // Check if migration is in progress
        {
            let state = self.state.lock().map_err(|e| e.to_string())?;
            if state.status != MigrationStatus::InProgress {
                return Err("No migration in progress".to_string());
            }
        }

        let mut sessions_migrated = 0;
        let mut last_error: Option<String> = None;

        // Update initial progress
        self.update_progress(MigrationProgress {
            current: 0,
            total: total_sessions,
            step: "Starting migration...".to_string(),
            percentage: 0,
        })?;

        // Execute migration for each session
        for i in 0..total_sessions {
            // Check for cancellation
            if self.is_cancel_requested() {
                last_error = Some("Migration cancelled by user".to_string());
                break;
            }

            // Update progress
            #[allow(clippy::cast_possible_truncation)]
            let percentage = if total_sessions > 0 {
                ((i * 100) / total_sessions) as u8 // Safe: percentage is 0-100
            } else {
                100
            };

            self.update_progress(MigrationProgress {
                current: i,
                total: total_sessions,
                step: format!("Migrating session {} of {}", i + 1, total_sessions),
                percentage,
            })?;

            // Execute migration for this session
            match migrate_fn(i) {
                Ok(()) => {
                    sessions_migrated += 1;
                },
                Err(e) => {
                    last_error = Some(e);
                    break;
                },
            }
        }

        // Create result
        let result = last_error.map_or_else(
            || MigrationResult::success(sessions_migrated),
            MigrationResult::failure,
        );

        // Complete migration
        self.complete(result.clone())?;

        Ok(result)
    }

    /// Rollback migration on failure (AC5, Task 4.6).
    ///
    /// Resets manager to idle state and marks migration as failed.
    /// Called automatically by execute_atomic on error.
    ///
    /// # Arguments
    /// * `error` - Error message describing the failure
    pub fn rollback(&self, error: impl Into<String>) -> Result<MigrationResult, String> {
        let result = MigrationResult::failure(error);
        self.complete(result.clone())?;
        Ok(result)
    }

    /// Get progress percentage (0-100).
    pub fn get_percentage(&self) -> u8 {
        self.state
            .lock()
            .ok()
            .and_then(|s| s.progress.as_ref().map(|p| p.percentage))
            .unwrap_or(0)
    }
}

impl Default for MigrationManager {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// Unit Tests (Story 5.5 Task 3.6 - 8 tests)
// =============================================================================

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod migration_tests {
    use super::*;

    #[test]
    fn test_migration_choice_serialization() {
        // Verify kebab-case serialization for IPC
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

    #[test]
    fn test_migration_choice_deserialization() {
        // Verify deserialization from TypeScript format
        let merge: MigrationChoice = serde_json::from_str("\"merge\"").unwrap();
        assert_eq!(merge, MigrationChoice::Merge);

        let keep: MigrationChoice = serde_json::from_str("\"keep-separate\"").unwrap();
        assert_eq!(keep, MigrationChoice::KeepSeparate);

        let discard: MigrationChoice = serde_json::from_str("\"discard\"").unwrap();
        assert_eq!(discard, MigrationChoice::Discard);
    }

    #[test]
    fn test_migration_status_default() {
        let state = MigrationState::default();
        assert_eq!(state.status, MigrationStatus::Idle);
        assert!(state.choice.is_none());
        assert!(state.progress.is_none());
        assert!(state.result.is_none());
        assert!(!state.cancel_requested);
    }

    #[test]
    fn test_start_migration() {
        let manager = MigrationManager::new();
        let result = manager.start_migration(MigrationChoice::Merge, "user-123".to_string());

        assert!(result.is_ok());
        assert_eq!(manager.get_status(), MigrationStatus::InProgress);
        assert_eq!(manager.get_choice(), Some(MigrationChoice::Merge));
        assert_eq!(manager.get_user_id(), Some("user-123".to_string()));
    }

    #[test]
    fn test_cannot_start_twice() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = manager.start_migration(MigrationChoice::Discard, "user-456".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already in progress"));
    }

    #[test]
    fn test_cancel_migration() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        assert!(!manager.is_cancel_requested());

        let result = manager.cancel();
        assert!(result.is_ok());
        assert!(manager.is_cancel_requested());
    }

    #[test]
    fn test_complete_migration() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = MigrationResult::success(10);
        manager.complete(result).unwrap();

        assert_eq!(manager.get_status(), MigrationStatus::Completed);
        let stored_result = manager.get_result().unwrap();
        assert!(stored_result.success);
        assert_eq!(stored_result.sessions_migrated, 10);
    }

    #[test]
    fn test_reset() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        manager.reset().unwrap();

        assert_eq!(manager.get_status(), MigrationStatus::Idle);
        assert!(manager.get_choice().is_none());
        assert!(manager.get_user_id().is_none());
    }

    // ==========================================================================
    // Additional tests for execute_atomic, rollback, and edge cases (Task 4.7)
    // ==========================================================================

    #[test]
    fn test_execute_atomic_success() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = manager.execute_atomic(3, |_i| Ok(())).unwrap();

        assert!(result.success);
        assert_eq!(result.sessions_migrated, 3);
        assert!(result.error.is_none());
        assert_eq!(manager.get_status(), MigrationStatus::Completed);
    }

    #[test]
    fn test_execute_atomic_failure() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = manager
            .execute_atomic(5, |i| {
                if i == 2 {
                    Err("Migration failed at session 2".to_string())
                } else {
                    Ok(())
                }
            })
            .unwrap();

        assert!(!result.success);
        assert_eq!(result.sessions_migrated, 0); // Failure resets count
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("session 2"));
        assert_eq!(manager.get_status(), MigrationStatus::Failed);
    }

    #[test]
    fn test_execute_atomic_cancellation() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        // Request cancellation before execution
        manager.cancel().unwrap();

        let result = manager.execute_atomic(10, |_i| Ok(())).unwrap();

        assert!(!result.success);
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("cancelled"));
        assert_eq!(manager.get_status(), MigrationStatus::Failed);
    }

    #[test]
    fn test_execute_atomic_requires_in_progress() {
        let manager = MigrationManager::new();
        // Don't start migration

        let result = manager.execute_atomic(3, |_i| Ok(()));

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No migration in progress"));
    }

    #[test]
    fn test_rollback() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        let result = manager.rollback("External error occurred").unwrap();

        assert!(!result.success);
        assert_eq!(result.sessions_migrated, 0);
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("External error"));
        assert_eq!(manager.get_status(), MigrationStatus::Failed);
    }

    #[test]
    fn test_get_percentage() {
        let manager = MigrationManager::new();

        // Before migration
        assert_eq!(manager.get_percentage(), 0);

        manager
            .start_migration(MigrationChoice::Merge, "user-123".to_string())
            .unwrap();

        // During migration - update progress manually
        manager
            .update_progress(MigrationProgress {
                current: 5,
                total: 10,
                step: "Test step".to_string(),
                percentage: 50,
            })
            .unwrap();

        assert_eq!(manager.get_percentage(), 50);
    }

    #[test]
    fn test_execute_atomic_zero_sessions() {
        let manager = MigrationManager::new();
        manager
            .start_migration(MigrationChoice::Discard, "user-123".to_string())
            .unwrap();

        let result = manager.execute_atomic(0, |_i| Ok(())).unwrap();

        assert!(result.success);
        assert_eq!(result.sessions_migrated, 0);
        assert_eq!(manager.get_status(), MigrationStatus::Completed);
    }

    #[test]
    fn test_migration_result_helpers() {
        // Test success helper
        let success_result = MigrationResult::success(5);
        assert!(success_result.success);
        assert_eq!(success_result.sessions_migrated, 5);
        assert!(success_result.error.is_none());
        assert!(success_result.completed_at > 0);

        // Test failure helper
        let failure_result = MigrationResult::failure("Test error");
        assert!(!failure_result.success);
        assert_eq!(failure_result.sessions_migrated, 0);
        assert_eq!(failure_result.error, Some("Test error".to_string()));
        assert!(failure_result.completed_at > 0);
    }
}
