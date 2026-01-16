"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import {
  selectCanWrite,
  selectIsAuthenticated,
  selectNeedsReauth,
  useCredentialStore,
} from "@/stores/credentials";
import type {
  DegradedMode,
  OfflineValidationResult,
  RefreshResult,
} from "@/types/credentials";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";

/**
 * Result of useOfflineAuth hook (Story 5.4)
 */
export interface UseOfflineAuthResult {
  /** Whether user is authenticated (considering offline mode) */
  isAuthenticated: boolean;
  /** Current offline validation result */
  offlineValidation: OfflineValidationResult;
  /** Current degraded mode level */
  degradedMode: DegradedMode;
  /** Days remaining in offline window */
  daysRemaining: number;
  /** Whether credentials need refresh when online */
  needsRefresh: boolean;
  /** Whether user can perform write operations */
  canWrite: boolean;
  /** Whether re-authentication is required */
  needsReauth: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Last refresh result */
  lastRefreshResult: RefreshResult | null;
  /** Error message if any */
  error: string | null;
  /** Validate offline credentials (AC1, AC4) */
  validateOffline: () => Promise<OfflineValidationResult | null>;
  /** Refresh credentials manually (AC7) */
  refreshCredentials: () => Promise<RefreshResult | null>;
  /** Get current degraded mode (AC3) */
  getDegradedMode: () => Promise<DegradedMode | null>;
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
 * useOfflineAuth
 *
 * Hook for offline authentication management.
 * Provides offline validation, degraded mode handling, and refresh capabilities.
 *
 * Story 5.4: AC1-7
 * - AC1: Offline authentication from cached credentials
 * - AC3: Degraded mode indicators
 * - AC4: Offline validation performance
 * - AC7: Manual refresh button
 */
export function useOfflineAuth(): UseOfflineAuthResult {
  const {
    offlineValidation,
    degradedMode,
    lastRefreshResult,
    isRefreshing,
    setOfflineValidation,
    setDegradedMode,
    setRefreshResult,
    setIsRefreshing,
  } = useCredentialStore();

  const [error, setError] = useState<string | null>(null);

  // Use selectors for computed values
  const isAuthenticated = useCredentialStore(selectIsAuthenticated);
  const canWrite = useCredentialStore(selectCanWrite);
  const needsReauth = useCredentialStore(selectNeedsReauth);

  /**
   * Validate offline credentials (AC1, AC4)
   *
   * Calls Rust backend to validate credentials for offline use.
   * Performance: Must complete within 100ms (NFR-CRED-6)
   */
  const validateOffline =
    useCallback(async (): Promise<OfflineValidationResult | null> => {
      if (!isTauriEnvironment()) {
        return DEFAULT_OFFLINE_VALIDATION;
      }

      try {
        setError(null);
        const result = await invoke<OfflineValidationResult>(
          "validate_offline_credentials"
        );
        setOfflineValidation(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        // Not found is expected when not authenticated
        if (!errorMessage.includes("NotFound")) {
          setError(errorMessage);
        }
        setOfflineValidation(DEFAULT_OFFLINE_VALIDATION);
        return null;
      }
    }, [setOfflineValidation]);

  /**
   * Refresh credentials manually (AC7)
   *
   * Triggers a credential refresh attempt.
   * Shows loading state and returns result.
   */
  const refreshCredentials =
    useCallback(async (): Promise<RefreshResult | null> => {
      if (!isTauriEnvironment()) {
        return null;
      }

      try {
        setError(null);
        setIsRefreshing(true);
        const result = await invoke<RefreshResult>("refresh_credentials");
        setRefreshResult(result);

        // If refresh succeeded, re-validate offline status
        if (result.success) {
          await validateOffline();
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        const failedResult: RefreshResult = {
          success: false,
          error: errorMessage,
          requires_reauth: false,
          retry_after_ms: null,
        };
        setRefreshResult(failedResult);
        return failedResult;
      } finally {
        setIsRefreshing(false);
      }
    }, [setIsRefreshing, setRefreshResult, validateOffline]);

  /**
   * Get current degraded mode (AC3)
   */
  const getDegradedMode =
    useCallback(async (): Promise<DegradedMode | null> => {
      if (!isTauriEnvironment()) {
        return "RequiresReauth";
      }

      try {
        setError(null);
        const mode = await invoke<DegradedMode>("get_degraded_mode");
        setDegradedMode(mode);
        return mode;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        // Not found is expected when not authenticated
        if (!errorMessage.includes("NotFound")) {
          setError(errorMessage);
        }
        return null;
      }
    }, [setDegradedMode]);

  // Initial load - validate offline status on mount
  useEffect(() => {
    validateOffline();
  }, [validateOffline]);

  return {
    isAuthenticated,
    offlineValidation,
    degradedMode,
    daysRemaining: offlineValidation.days_remaining,
    needsRefresh: offlineValidation.needs_refresh,
    canWrite,
    needsReauth,
    isRefreshing,
    lastRefreshResult,
    error,
    validateOffline,
    refreshCredentials,
    getDegradedMode,
  };
}
