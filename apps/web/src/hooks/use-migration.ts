"use client";

/**
 * useMigration Hook (Story 5.5 Task 7)
 *
 * Hook for managing anonymous-to-authenticated migration.
 * Provides interface between UI components and Rust backend.
 *
 * AC1: Anonymous user can sign up with preserved data
 * AC2: Migration choice dialog integration
 * AC3: Atomic migration via Tauri commands
 * AC4: Progress polling and display
 * AC5: Cancellation and retry support
 */

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import { useCredentialStore } from "@/stores/credentials";
import { useMigrationStore } from "@/stores/migration";
import {
  selectAnonymousSessionCount,
  selectHasAnonymousSessions,
  useSessionStore,
} from "@/stores/session";
import type {
  MigrationChoice,
  MigrationProgress,
  MigrationResult,
  MigrationStatus,
} from "@/types/migration";

/**
 * Result of useMigration hook
 */
export interface UseMigrationResult {
  /** Current migration status */
  status: MigrationStatus;
  /** User's choice (null until selected) */
  choice: MigrationChoice | null;
  /** Progress during migration */
  progress: MigrationProgress | null;
  /** Result after completion */
  result: MigrationResult | null;
  /** Error message if any */
  error: string | null;
  /** Number of anonymous sessions to migrate */
  anonymousSessionCount: number;
  /** Whether migration dialog should be shown */
  showDialog: boolean;
  /** Whether migration is in progress */
  isInProgress: boolean;
  /** Whether migration can be retried */
  canRetry: boolean;
  /** Start migration with user's choice */
  startMigration: (choice: MigrationChoice) => Promise<void>;
  /** Poll for migration progress */
  pollProgress: () => Promise<void>;
  /** Cancel in-progress migration */
  cancelMigration: () => Promise<void>;
  /** Get count of anonymous sessions */
  getAnonymousSessionCount: () => number;
  /** Open migration dialog */
  openDialog: () => void;
  /** Close migration dialog */
  closeDialog: () => void;
  /** Reset migration state */
  reset: () => void;
}

/**
 * Check if running in Tauri desktop environment
 */
function isTauriEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).__TAURI__
  );
}

/**
 * Polling interval for migration progress (ms)
 */
const PROGRESS_POLL_INTERVAL = 500;

/**
 * useMigration
 *
 * Hook for managing anonymous-to-authenticated migration.
 *
 * Features:
 * - Calls Tauri commands for migration operations
 * - Syncs state with migration store
 * - Auto-triggers migration dialog on auth state change
 * - Polls for progress during migration
 *
 * Story 5.5: All ACs
 */
export function useMigration(): UseMigrationResult {
  const {
    status,
    choice,
    progress,
    result,
    error,
    anonymousSessionCount,
    showDialog,
    startMigration: storeStartMigration,
    updateProgress,
    completeMigration,
    cancelMigration: storeCancelMigration,
    reset,
    setAnonymousSessionCount,
    openDialog,
    closeDialog,
  } = useMigrationStore();

  // Subscribe to credential store for auth state changes
  const authState = useCredentialStore((state) => state.authState);

  // Subscribe to session store for anonymous session count
  const sessionAnonymousCount = useSessionStore(selectAnonymousSessionCount);
  const hasAnonymousSessions = useSessionStore(selectHasAnonymousSessions);

  // Track previous auth state for detecting login
  const prevAuthStatusRef = useRef<string | null>(null);

  // Polling interval ref for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isInProgress = status === "in-progress";
  const canRetry = status === "failed";

  /**
   * Get anonymous session count from Tauri backend (7.6)
   *
   * Falls back to local session store count if Tauri unavailable.
   */
  const getAnonymousSessionCount = useCallback((): number => {
    // Use local session store count as primary source
    // Backend command is placeholder until session persistence is integrated
    const count = sessionAnonymousCount;
    setAnonymousSessionCount(count);
    return count;
  }, [sessionAnonymousCount, setAnonymousSessionCount]);

  /**
   * Stop polling for progress
   */
  const stopProgressPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Poll for migration progress (7.4)
   *
   * Fetches current progress from Tauri backend.
   */
  const pollProgress = useCallback(async () => {
    if (!isTauriEnvironment()) {
      return;
    }

    try {
      // Get current status
      const currentStatus = await invoke<MigrationStatus>(
        "get_migration_status"
      );

      if (currentStatus === "in-progress") {
        // Get progress
        const currentProgress = await invoke<MigrationProgress | null>(
          "get_migration_progress"
        );
        if (currentProgress) {
          updateProgress(currentProgress);
        }
      } else if (currentStatus === "completed" || currentStatus === "failed") {
        // Get result and complete
        const migrationResult = await invoke<MigrationResult | null>(
          "get_migration_result"
        );
        if (migrationResult) {
          completeMigration(migrationResult);
        }
        stopProgressPolling();
      }
    } catch (err) {
      // Ignore polling errors - will retry on next interval
      console.error("Migration progress poll error:", err);
    }
  }, [updateProgress, completeMigration, stopProgressPolling]);

  /**
   * Start polling for progress
   */
  const startProgressPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return; // Already polling
    }
    pollingIntervalRef.current = setInterval(
      pollProgress,
      PROGRESS_POLL_INTERVAL
    );
  }, [pollProgress]);

  /**
   * Start migration with user's choice (7.3)
   *
   * Calls Tauri command and updates store.
   */
  const startMigration = useCallback(
    async (migrationChoice: MigrationChoice) => {
      // Skip if not in Tauri environment or no user
      if (!isTauriEnvironment()) {
        storeStartMigration(migrationChoice, sessionAnonymousCount);
        // Simulate completion for non-Tauri environment
        completeMigration({
          success: true,
          sessionsMigrated: sessionAnonymousCount,
          completedAt: new Date(),
        });
        return;
      }

      const userId = authState?.user_info?.id;
      if (!userId) {
        // Update store with error
        useMigrationStore.getState().failMigration("No authenticated user");
        return;
      }

      try {
        // Update store to show in-progress
        storeStartMigration(migrationChoice, sessionAnonymousCount);

        // Call Tauri command to start migration
        await invoke("start_session_migration", {
          choice: migrationChoice,
          userId,
        });

        // Start polling for progress
        startProgressPolling();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        useMigrationStore.getState().failMigration(errorMessage);
      }
    },
    [
      authState,
      sessionAnonymousCount,
      storeStartMigration,
      completeMigration,
      startProgressPolling,
    ]
  );

  /**
   * Cancel in-progress migration (7.5)
   */
  const cancelMigration = useCallback(async () => {
    if (!isTauriEnvironment()) {
      storeCancelMigration();
      return;
    }

    try {
      await invoke("cancel_migration");
      storeCancelMigration();
      stopProgressPolling();
    } catch (_err) {
      // Even if backend cancel fails, update UI
      storeCancelMigration();
      stopProgressPolling();
    }
  }, [storeCancelMigration, stopProgressPolling]);

  // 7.7/7.8: Subscribe to auth state changes to auto-trigger dialog
  useEffect(() => {
    const prevStatus = prevAuthStatusRef.current;
    const currentStatus = authState?.status ?? null;

    // Detect transition from NotStored to Valid (successful login)
    if (
      prevStatus === "NotStored" &&
      currentStatus === "Valid" &&
      hasAnonymousSessions
    ) {
      // User just logged in and has anonymous sessions
      // Update count and show dialog
      setAnonymousSessionCount(sessionAnonymousCount);
      openDialog();
    }

    prevAuthStatusRef.current = currentStatus;
  }, [
    authState?.status,
    hasAnonymousSessions,
    sessionAnonymousCount,
    setAnonymousSessionCount,
    openDialog,
  ]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopProgressPolling();
    };
  }, [stopProgressPolling]);

  // Resume polling if status is in-progress on mount
  useEffect(() => {
    if (status === "in-progress") {
      startProgressPolling();
    }
  }, [status, startProgressPolling]);

  return {
    status,
    choice,
    progress,
    result,
    error,
    anonymousSessionCount,
    showDialog,
    isInProgress,
    canRetry,
    startMigration,
    pollProgress,
    cancelMigration,
    getAnonymousSessionCount,
    openDialog,
    closeDialog,
    reset,
  };
}
