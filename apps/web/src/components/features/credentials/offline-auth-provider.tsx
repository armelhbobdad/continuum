/**
 * Offline Auth Provider Component (Story 5.4, AC1, AC5)
 *
 * Provides offline authentication context and silent refresh functionality.
 * Should be placed in provider hierarchy after ConnectivityProvider.
 *
 * # Usage
 * ```tsx
 * <ConnectivityProvider>
 *   <OfflineAuthProvider>
 *     <App />
 *   </OfflineAuthProvider>
 * </ConnectivityProvider>
 * ```
 *
 * # Features
 * - Validates offline credentials on mount (AC1)
 * - Silent refresh when coming online (AC5)
 * - Automatic credential validation after successful refresh
 */

"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import { useConnectivityStore } from "@/stores/connectivity";

/**
 * Silent refresh delay in milliseconds (5 seconds after coming online)
 * Per Story 4.5 sync-on-reconnect pattern
 */
const SILENT_REFRESH_DELAY_MS = 5000;

export interface OfflineAuthProviderProps {
  children: ReactNode;
  /** Disable silent refresh on reconnect (for testing) */
  disableSilentRefresh?: boolean;
  /** Custom refresh delay in ms (for testing) */
  refreshDelayMs?: number;
}

/**
 * OfflineAuthProvider
 *
 * Initializes offline authentication at the application root.
 * Handles credential validation and silent refresh on connectivity changes.
 *
 * Story 5.4: AC1, AC5
 */
export function OfflineAuthProvider({
  children,
  disableSilentRefresh = false,
  refreshDelayMs = SILENT_REFRESH_DELAY_MS,
}: OfflineAuthProviderProps) {
  const { validateOffline, refreshCredentials, needsRefresh, degradedMode } =
    useOfflineAuth();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const wasOnlineRef = useRef(isOnline);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Perform silent refresh with debounce
   * AC5: Silent refresh when coming online
   */
  const performSilentRefresh = useCallback(async () => {
    // Only refresh if needed or in degraded mode
    if (!needsRefresh && degradedMode === "FullAccess") {
      return;
    }

    // Attempt refresh
    const result = await refreshCredentials();

    if (result?.success) {
      // Validate offline status after successful refresh
      await validateOffline();
    }
  }, [needsRefresh, degradedMode, refreshCredentials, validateOffline]);

  /**
   * Handle connectivity transitions
   * AC5: Silent refresh when coming online
   */
  useEffect(() => {
    // Skip if silent refresh is disabled
    if (disableSilentRefresh) {
      wasOnlineRef.current = isOnline;
      return;
    }

    // Detect transition from offline to online
    if (isOnline && !wasOnlineRef.current) {
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Schedule silent refresh after delay
      // Per Story 4.5 pattern: wait 5 seconds for connection to stabilize
      refreshTimeoutRef.current = setTimeout(() => {
        performSilentRefresh();
        refreshTimeoutRef.current = null;
      }, refreshDelayMs);
    }

    // Update previous state
    wasOnlineRef.current = isOnline;

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isOnline, disableSilentRefresh, refreshDelayMs, performSilentRefresh]);

  // Return children directly without wrapper element
  // This ensures minimal DOM impact and proper React tree structure
  return children;
}

export default OfflineAuthProvider;
