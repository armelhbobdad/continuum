/**
 * Migration Types (Story 5.5 Task 2)
 *
 * Type definitions for anonymous-to-authenticated migration.
 * Supports merge, keep-separate, and discard migration choices.
 *
 * AC2: Migration Choice Dialog
 * AC3: Atomic Data Migration
 * AC4: Migration Progress Display
 * AC5: Migration Failure Recovery
 */

/**
 * User's choice for handling anonymous data during migration (AC2).
 *
 * - "merge": Combine anonymous sessions with authenticated account
 * - "keep-separate": Start fresh with account, keep anonymous data local-only
 * - "discard": Delete anonymous data, use account only
 */
export type MigrationChoice = "merge" | "keep-separate" | "discard";

/**
 * Current status of migration process (AC4).
 *
 * - "idle": No migration in progress
 * - "in-progress": Migration currently running
 * - "completed": Migration finished successfully
 * - "failed": Migration encountered an error
 */
export type MigrationStatus = "idle" | "in-progress" | "completed" | "failed";

/**
 * Progress information during migration (AC4).
 * Displayed to user during migration process.
 */
export interface MigrationProgress {
  /** Current session being processed */
  current: number;
  /** Total sessions to process */
  total: number;
  /** Description of current step */
  step: string;
  /** Percentage complete (0-100) */
  percentage: number;
}

/**
 * Result of migration operation (AC3, AC5).
 * Returned after migration completes or fails.
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of sessions migrated (0 for failures) */
  sessionsMigrated?: number;
  /** Timestamp of completion (optional for failures) */
  completedAt?: Date;
}

/**
 * Complete migration state for UI.
 * Used by migration store and components.
 */
export interface MigrationState {
  /** Current migration status */
  status: MigrationStatus;
  /** User's choice (null until selected) */
  choice: MigrationChoice | null;
  /** Progress during migration (null when not in progress) */
  progress: MigrationProgress | null;
  /** Result after completion (null until complete) */
  result: MigrationResult | null;
  /** Count of anonymous sessions to migrate */
  anonymousSessionCount: number;
  /** Error message (null if no error) */
  error: string | null;
}

/**
 * Default migration state.
 * Represents initial idle state before any migration action.
 */
export const DEFAULT_MIGRATION_STATE: MigrationState = {
  status: "idle",
  choice: null,
  progress: null,
  result: null,
  anonymousSessionCount: 0,
  error: null,
};

// =============================================================================
// Status helper functions
// =============================================================================

/**
 * Check if migration is in idle state.
 *
 * @param state - Migration state
 * @returns true if status is "idle"
 */
export function isMigrationIdle(state: MigrationState): boolean {
  return state.status === "idle";
}

/**
 * Check if migration is in progress.
 *
 * @param state - Migration state
 * @returns true if status is "in-progress"
 */
export function isMigrationInProgress(state: MigrationState): boolean {
  return state.status === "in-progress";
}

/**
 * Check if migration completed successfully.
 *
 * @param state - Migration state
 * @returns true if status is "completed"
 */
export function isMigrationComplete(state: MigrationState): boolean {
  return state.status === "completed";
}

/**
 * Check if migration failed.
 *
 * @param state - Migration state
 * @returns true if status is "failed"
 */
export function isMigrationFailed(state: MigrationState): boolean {
  return state.status === "failed";
}

/**
 * Get current migration progress percentage.
 *
 * @param state - Migration state
 * @returns Percentage (0-100), or 0 if no progress
 */
export function getMigrationProgressPercentage(state: MigrationState): number {
  return state.progress?.percentage ?? 0;
}
