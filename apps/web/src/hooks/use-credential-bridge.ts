"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { useCredentialStore } from "@/stores/credentials";
import type { AuthState, OpaqueToken } from "@/types/credentials";
import { DEFAULT_AUTH_STATE, isNotFoundError } from "@/types/credentials";

/**
 * Result of useCredentialBridge hook
 */
export interface UseCredentialBridgeResult {
  /** Current authentication state */
  authState: AuthState | null;
  /** Current session token (opaque) */
  sessionToken: OpaqueToken | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether we're loading auth state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh auth state from Rust backend */
  refreshAuthState: () => Promise<void>;
  /** Get session token from Rust backend */
  getSessionToken: () => Promise<OpaqueToken | null>;
  /** Clear all credentials (logout) */
  clearCredentials: () => Promise<void>;
  /** Check if credentials are available (fast check) */
  checkAvailability: () => Promise<boolean>;
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
 * useCredentialBridge
 *
 * Hook for interacting with the Rust Credential Bridge.
 * SECURITY: This hook NEVER has access to raw credentials.
 * All sensitive data remains in Rust.
 *
 * Story 5.1: AC2, AC3, AC4
 */
export function useCredentialBridge(): UseCredentialBridgeResult {
  const {
    authState,
    sessionToken,
    setAuthState,
    setSessionToken,
    clearAuthState,
  } = useCredentialStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Computed: user is authenticated if status is Valid and has session_id
  const isAuthenticated =
    authState?.status === "Valid" && authState?.session_id !== null;

  /**
   * Refresh auth state from Rust backend (AC2)
   */
  const refreshAuthState = useCallback(async () => {
    // Skip if not in Tauri environment
    if (!isTauriEnvironment()) {
      setAuthState(DEFAULT_AUTH_STATE);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const state = await invoke<AuthState>("get_auth_status");
      setAuthState(state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setAuthState(DEFAULT_AUTH_STATE);
    } finally {
      setIsLoading(false);
    }
  }, [setAuthState]);

  /**
   * Get session token from Rust backend (AC2)
   *
   * Returns opaque token - NOT the actual credential value.
   */
  const getSessionToken = useCallback(async (): Promise<OpaqueToken | null> => {
    // Skip if not in Tauri environment
    if (!isTauriEnvironment()) {
      setSessionToken(null);
      return null;
    }

    try {
      const token = await invoke<OpaqueToken>("get_session_token");
      setSessionToken(token);
      return token;
    } catch (err) {
      // NotFound is not an error - user may not be authenticated
      if (isNotFoundError(err)) {
        setSessionToken(null);
        return null;
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    }
  }, [setSessionToken]);

  /**
   * Clear all credentials (logout) (AC1, AC3)
   *
   * Triggers secure wipe in Rust backend.
   */
  const clearCredentials = useCallback(async () => {
    // Skip if not in Tauri environment
    if (!isTauriEnvironment()) {
      clearAuthState();
      return;
    }

    try {
      await invoke("clear_credentials");
      clearAuthState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, [clearAuthState]);

  /**
   * Check if credentials are available (fast check) (AC4)
   *
   * Performance: Must complete within 500ms (NFR-CRED-2)
   */
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    // Skip if not in Tauri environment
    if (!isTauriEnvironment()) {
      return false;
    }

    try {
      return await invoke<boolean>("check_credential_availability");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  }, []);

  // Initial load - fetch auth state on mount
  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  return {
    authState,
    sessionToken,
    isAuthenticated,
    isLoading,
    error,
    refreshAuthState,
    getSessionToken,
    clearCredentials,
    checkAvailability,
  };
}
