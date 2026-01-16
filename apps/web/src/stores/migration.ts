"use client";

/**
 * Migration Store (Story 5.5 Task 6)
 *
 * MEMORY-ONLY Zustand store for anonymous-to-authenticated migration state.
 * Manages migration UI state separately from backend migration logic.
 *
 * SECURITY: This store is MEMORY-ONLY (never persisted).
 * Resets to idle on app restart - Rust backend is source of truth.
 *
 * Per ADR-PRIVACY-001: Transient state in memory-only stores.
 *
 * AC2: Migration Choice Dialog state
 * AC3: Migration result tracking
 * AC4: Progress display state
 * AC5: Failure recovery state
 */

import { create } from "zustand";
import type {
  MigrationChoice,
  MigrationProgress,
  MigrationResult,
  MigrationState,
  MigrationStatus,
} from "@/types/migration";
import { DEFAULT_MIGRATION_STATE } from "@/types/migration";

/**
 * Migration Store State Interface.
 * Extends MigrationState with actions for state management.
 */
export interface MigrationStoreState extends MigrationState {
  /** Start migration with user's choice (AC2, AC3) */
  startMigration: (choice: MigrationChoice, anonymousCount: number) => void;
  /** Update migration progress (AC4) */
  updateProgress: (progress: MigrationProgress) => void;
  /** Complete migration with result (AC3, AC5) */
  completeMigration: (result: MigrationResult) => void;
  /** Mark migration as failed (AC5) */
  failMigration: (error: string) => void;
  /** Request cancellation of in-progress migration (AC5) */
  cancelMigration: () => void;
  /** Reset to initial idle state */
  reset: () => void;
  /** Set anonymous session count for dialog display (AC2) */
  setAnonymousSessionCount: (count: number) => void;
  /** Show migration dialog (for OAuth flow integration) */
  showDialog: boolean;
  /** Open migration dialog */
  openDialog: () => void;
  /** Close migration dialog */
  closeDialog: () => void;
}

/**
 * useMigrationStore
 *
 * MEMORY-ONLY store for migration state.
 * NEVER persisted to localStorage/sessionStorage.
 *
 * The Rust backend (MigrationManager) is the source of truth for
 * actual migration execution. This store syncs UI state with backend.
 *
 * Story 5.5: AC2, AC3, AC4, AC5
 */
export const useMigrationStore = create<MigrationStoreState>((set) => ({
  // Initial state from DEFAULT_MIGRATION_STATE
  ...DEFAULT_MIGRATION_STATE,
  showDialog: false,

  // 6.3: startMigration action
  startMigration: (choice, anonymousCount) =>
    set({
      status: "in-progress" as MigrationStatus,
      choice,
      anonymousSessionCount: anonymousCount,
      progress: {
        current: 0,
        total: anonymousCount,
        step: "Preparing migration...",
        percentage: 0,
      },
      result: null,
      error: null,
    }),

  // 6.4: updateProgress action
  updateProgress: (progress) =>
    set({
      progress,
    }),

  // 6.5: completeMigration action
  completeMigration: (result) =>
    set({
      status: result.success
        ? ("completed" as MigrationStatus)
        : ("failed" as MigrationStatus),
      progress: null,
      result,
      error: result.error ?? null,
    }),

  // failMigration action
  failMigration: (error) =>
    set({
      status: "failed" as MigrationStatus,
      progress: null,
      error,
    }),

  // 6.6: cancelMigration action
  cancelMigration: () =>
    set({
      status: "failed" as MigrationStatus,
      progress: null,
      error: "Migration cancelled by user",
    }),

  // 6.7: reset action
  reset: () =>
    set({
      ...DEFAULT_MIGRATION_STATE,
      showDialog: false,
    }),

  // setAnonymousSessionCount action
  setAnonymousSessionCount: (count) =>
    set({
      anonymousSessionCount: count,
    }),

  // Dialog control actions
  openDialog: () => set({ showDialog: true }),
  closeDialog: () => set({ showDialog: false }),
}));

// =============================================================================
// Selectors (Story 5.5 Task 6)
// =============================================================================

/**
 * Selector: Check if migration is in idle state.
 */
export const selectIsMigrationIdle = (state: MigrationStoreState): boolean =>
  state.status === "idle";

/**
 * Selector: Check if migration is in progress.
 */
export const selectIsMigrationInProgress = (
  state: MigrationStoreState
): boolean => state.status === "in-progress";

/**
 * Selector: Check if migration completed (success or failure).
 */
export const selectIsMigrationComplete = (
  state: MigrationStoreState
): boolean => state.status === "completed" || state.status === "failed";

/**
 * Selector: Check if migration succeeded.
 */
export const selectIsMigrationSuccessful = (
  state: MigrationStoreState
): boolean => state.status === "completed" && state.result?.success === true;

/**
 * Selector: Check if migration failed.
 */
export const selectIsMigrationFailed = (state: MigrationStoreState): boolean =>
  state.status === "failed";

/**
 * Selector: Get migration progress percentage.
 */
export const selectMigrationPercentage = (state: MigrationStoreState): number =>
  state.progress?.percentage ?? 0;

/**
 * Selector: Check if there are anonymous sessions to migrate.
 */
export const selectHasAnonymousSessions = (
  state: MigrationStoreState
): boolean => state.anonymousSessionCount > 0;

/**
 * Selector: Check if migration dialog should be shown.
 */
export const selectShowMigrationDialog = (
  state: MigrationStoreState
): boolean => state.showDialog;

/**
 * Selector: Get error message if migration failed.
 */
export const selectMigrationError = (
  state: MigrationStoreState
): string | null => state.error;

/**
 * Selector: Can retry migration (after failure).
 */
export const selectCanRetryMigration = (state: MigrationStoreState): boolean =>
  state.status === "failed";

/**
 * Selector: Get current step description.
 */
export const selectCurrentStep = (state: MigrationStoreState): string =>
  state.progress?.step ?? "";

/**
 * Selector: Get sessions migrated count.
 */
export const selectSessionsMigrated = (state: MigrationStoreState): number =>
  state.result?.sessionsMigrated ?? 0;
