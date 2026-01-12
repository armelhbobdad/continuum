"use client";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OAuthError, OAuthProgress, OAuthProvider } from "@/types";
import {
  DEFAULT_OAUTH_PROGRESS,
  getOAuthErrorMessage,
  isOAuthComplete,
  isOAuthFailed,
  isOAuthLoading,
  isTimeoutError,
} from "@/types";

/**
 * Progress polling interval in milliseconds (AC4)
 *
 * Per story spec: poll every 1 second during active flows
 */
export const PROGRESS_POLL_INTERVAL_MS = 1000;

/**
 * Result of useOAuthFlow hook (Story 5.3)
 */
export interface UseOAuthFlowResult {
  /** Current OAuth progress state */
  progress: OAuthProgress;
  /** Whether an OAuth flow is in progress */
  isLoading: boolean;
  /** Whether OAuth flow completed successfully */
  isComplete: boolean;
  /** Whether OAuth flow failed */
  isFailed: boolean;
  /** Current step number (0-4) */
  currentStep: number;
  /** Human-readable step description */
  stepDescription: string;
  /** Error if flow failed */
  error: OAuthError | null;
  /** Human-readable error message */
  errorMessage: string | null;
  /** Whether the error can be retried */
  canRetry: boolean;
  /** Time remaining until timeout (ms), null if no timeout */
  timeoutRemaining: number | null;
  /** Start OAuth flow with optional provider */
  startOAuth: (provider?: OAuthProvider) => Promise<void>;
  /** Submit manual authorization code (AC3) */
  submitManualCode: (code: string) => Promise<void>;
  /** Cancel the current OAuth flow */
  cancelOAuth: () => Promise<void>;
  /** Retry after failure */
  retryOAuth: () => Promise<void>;
  /** Trigger fallback to local server (AC2) */
  fallbackToLocalServer: () => Promise<void>;
  /** Trigger fallback to manual entry (AC3) */
  fallbackToManualEntry: () => Promise<void>;
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
 * useOAuthFlow
 *
 * Hook for managing OAuth authentication flow with 3-tier fallback.
 * Provides progress tracking, error handling, and all flow control methods.
 *
 * SECURITY: Tokens are stored via Credential Bridge (Story 5.1).
 * This hook NEVER has access to raw tokens - they remain in Rust.
 *
 * Story 5.3: AC1-AC6
 */
export function useOAuthFlow(): UseOAuthFlowResult {
  const [progress, setProgress] = useState<OAuthProgress>(
    DEFAULT_OAUTH_PROGRESS
  );
  const [error, setError] = useState<OAuthError | null>(null);
  const [lastProvider, setLastProvider] = useState<OAuthProvider | undefined>();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived state
  const state = progress.state;
  const isLoading = isOAuthLoading(state);
  const isComplete = isOAuthComplete(state);
  const isFailed = isOAuthFailed(state);
  const currentStep = progress.current_step;
  const stepDescription = progress.step_description;

  // Error handling
  const errorFromState =
    isFailed && state.type === "Failed" ? state.error : null;
  const currentError = error || errorFromState;
  const errorMessage = currentError ? getOAuthErrorMessage(currentError) : null;
  const canRetry = currentError ? isTimeoutError(currentError) : false;

  // Timeout calculation
  const timeoutRemaining = (() => {
    if (!progress.timeout_at) {
      return null;
    }
    const remaining = progress.timeout_at - Date.now();
    return remaining > 0 ? remaining : 0;
  })();

  /**
   * Poll for progress updates (AC4)
   */
  const pollProgress = useCallback(async () => {
    if (!isTauriEnvironment()) {
      return;
    }

    try {
      const newProgress = await invoke<OAuthProgress>("get_oauth_progress");
      setProgress(newProgress);

      // Extract error from failed state
      if (newProgress.state.type === "Failed") {
        setError(newProgress.state.error);
      }

      // Stop polling when flow is complete or failed
      if (
        (isOAuthComplete(newProgress.state) ||
          isOAuthFailed(newProgress.state)) &&
        pollingRef.current
      ) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      // Log but don't set error - polling failures are transient
      console.warn("OAuth progress poll failed:", err);
    }
  }, []);

  /**
   * Start progress polling
   */
  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Start new polling interval
    pollingRef.current = setInterval(pollProgress, PROGRESS_POLL_INTERVAL_MS);
  }, [pollProgress]);

  /**
   * Stop progress polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Start OAuth flow (AC1)
   */
  const startOAuth = useCallback(
    async (provider?: OAuthProvider) => {
      if (!isTauriEnvironment()) {
        setError({
          type: "InternalError",
          message: "OAuth is only available in desktop app",
        });
        return;
      }

      try {
        setError(null);
        setLastProvider(provider);

        // Start the flow - this returns the authorization URL
        const authUrl = await invoke<string>("start_oauth_flow", {
          provider: provider ?? null,
        });

        // Open URL in system browser using Tauri shell plugin
        await open(authUrl);

        // Start polling for progress
        startPolling();

        // Poll immediately to get initial state
        await pollProgress();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError({ type: "InternalError", message });
        stopPolling();
      }
    },
    [startPolling, stopPolling, pollProgress]
  );

  /**
   * Submit manual authorization code (AC3)
   */
  const submitManualCode = useCallback(
    async (code: string) => {
      if (!isTauriEnvironment()) {
        setError({
          type: "InternalError",
          message: "OAuth is only available in desktop app",
        });
        return;
      }

      try {
        setError(null);
        await invoke("submit_manual_code", { code });
        await pollProgress();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError({ type: "InternalError", message });
      }
    },
    [pollProgress]
  );

  /**
   * Cancel OAuth flow
   */
  const cancelOAuth = useCallback(async () => {
    stopPolling();

    if (!isTauriEnvironment()) {
      setProgress(DEFAULT_OAUTH_PROGRESS);
      setError(null);
      return;
    }

    try {
      await invoke("cancel_oauth_flow");
      setProgress(DEFAULT_OAUTH_PROGRESS);
      setError(null);
    } catch {
      // Ignore cancel errors - we're resetting anyway
      setProgress(DEFAULT_OAUTH_PROGRESS);
      setError(null);
    }
  }, [stopPolling]);

  /**
   * Retry OAuth flow after failure
   */
  const retryOAuth = useCallback(async () => {
    await cancelOAuth();
    await startOAuth(lastProvider);
  }, [cancelOAuth, startOAuth, lastProvider]);

  /**
   * Trigger fallback to local server (AC2)
   */
  const fallbackToLocalServer = useCallback(async () => {
    if (!isTauriEnvironment()) {
      setError({
        type: "InternalError",
        message: "OAuth is only available in desktop app",
      });
      return;
    }

    try {
      setError(null);
      await invoke<number>("fallback_to_local_server");

      // Get new authorization URL with local server redirect
      const authUrl = await invoke<string>("get_oauth_authorization_url", {
        provider: lastProvider ?? null,
      });

      // Open in system browser using Tauri shell plugin
      await open(authUrl);

      // Continue polling
      await pollProgress();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ type: "InternalError", message });
    }
  }, [lastProvider, pollProgress]);

  /**
   * Trigger fallback to manual entry (AC3)
   */
  const fallbackToManualEntry = useCallback(async () => {
    if (!isTauriEnvironment()) {
      setError({
        type: "InternalError",
        message: "OAuth is only available in desktop app",
      });
      return;
    }

    try {
      setError(null);
      await invoke("fallback_to_manual_entry");
      await pollProgress();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ type: "InternalError", message });
    }
  }, [pollProgress]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Auto-fetch initial progress on mount if in Tauri
  useEffect(() => {
    if (isTauriEnvironment()) {
      pollProgress();
    }
  }, [pollProgress]);

  return {
    progress,
    isLoading,
    isComplete,
    isFailed,
    currentStep,
    stepDescription,
    error: currentError,
    errorMessage,
    canRetry,
    timeoutRemaining,
    startOAuth,
    submitManualCode,
    cancelOAuth,
    retryOAuth,
    fallbackToLocalServer,
    fallbackToManualEntry,
  };
}
