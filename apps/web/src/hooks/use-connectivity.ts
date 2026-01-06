"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConnectivityStore } from "@/stores/connectivity";

/** Debounce delay for stable connectivity (2 seconds per AC4) */
const DEBOUNCE_MS = 2000;

/** Heartbeat interval for accurate detection */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Heartbeat endpoint - use a lightweight health endpoint */
const HEARTBEAT_URL = "/api/health";

/**
 * Result of useConnectivity hook.
 */
export interface UseConnectivityResult {
  /** Current online status */
  isOnline: boolean;
  /** Whether status is stable (not flapping) */
  isStable: boolean;
  /** Manually trigger connectivity check */
  checkNow: () => Promise<boolean>;
}

/**
 * Hook to monitor and report connectivity status.
 *
 * Uses navigator.onLine + fetch heartbeat for accurate detection.
 * Debounces status changes to avoid flicker.
 * Shows toast on reconnection.
 *
 * Desktop: Prefers Tauri network API when available.
 *
 * Story 4.1: AC1, AC3, AC4
 */
export function useConnectivity(): UseConnectivityResult {
  const { isOnline, isStable, setOnline, markStable, markUnstable } =
    useConnectivityStore();

  const debounceTimerRef = useRef<number | undefined>(undefined);
  const wasOfflineRef = useRef(false);
  const heartbeatIntervalRef = useRef<number | undefined>(undefined);

  /**
   * Perform actual connectivity check via fetch heartbeat.
   */
  const performHeartbeat = useCallback(async (): Promise<boolean> => {
    // Check for Tauri desktop API first (check value, not just property existence)
    if (
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__TAURI__
    ) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const result = await invoke<boolean>("check_connectivity");
        return result;
      } catch {
        // Fall through to browser detection
      }
    }

    // Browser detection: navigator.onLine + fetch heartbeat
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await fetch(HEARTBEAT_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  /**
   * Handle connectivity change with debouncing.
   */
  const handleConnectivityChange = useCallback(
    (online: boolean) => {
      // Clear any pending debounce
      if (debounceTimerRef.current !== undefined) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Mark as unstable during debounce period
      markUnstable();

      // Debounce the actual state change
      debounceTimerRef.current = window.setTimeout(() => {
        const previouslyOffline = wasOfflineRef.current;

        setOnline(online);
        markStable();

        // Show toast on reconnection (AC3)
        if (online && previouslyOffline) {
          toast.success("Back online", {
            duration: 3000,
            dismissible: true,
          });
        }

        wasOfflineRef.current = !online;
        debounceTimerRef.current = undefined;
      }, DEBOUNCE_MS);
    },
    [setOnline, markStable, markUnstable]
  );

  /**
   * Manual connectivity check.
   */
  const checkNow = useCallback(async (): Promise<boolean> => {
    const online = await performHeartbeat();
    handleConnectivityChange(online);
    return online;
  }, [performHeartbeat, handleConnectivityChange]);

  // Set up event listeners and heartbeat
  useEffect(() => {
    // Skip during SSR
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => handleConnectivityChange(true);
    const handleOffline = () => handleConnectivityChange(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    performHeartbeat().then((online) => {
      setOnline(online);
      wasOfflineRef.current = !online;
    });

    // Periodic heartbeat for accurate detection
    heartbeatIntervalRef.current = window.setInterval(async () => {
      const online = await performHeartbeat();
      // Only update if different to avoid unnecessary re-renders
      if (online !== useConnectivityStore.getState().isOnline) {
        handleConnectivityChange(online);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (debounceTimerRef.current !== undefined) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (heartbeatIntervalRef.current !== undefined) {
        window.clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [handleConnectivityChange, performHeartbeat, setOnline]);

  return {
    isOnline,
    isStable,
    checkNow,
  };
}
