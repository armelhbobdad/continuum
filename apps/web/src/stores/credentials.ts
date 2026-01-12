"use client";

import { create } from "zustand";
import type {
  AuthState,
  DegradedMode,
  OfflineValidationResult,
  OpaqueToken,
  RefreshResult,
} from "@/types/credentials";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";

/**
 * Credential Store State (Story 5.1, 5.4)
 *
 * SECURITY: This store is MEMORY-ONLY (never persisted).
 * It holds ONLY opaque tokens, never raw credentials.
 * All sensitive credentials remain in Rust backend.
 *
 * AC3: No credentials in web storage (localStorage, sessionStorage, cookies)
 * Story 5.4: Added offline validation and degraded mode state
 */
export interface CredentialStoreState {
  /** Current auth state (opaque, no secrets) */
  authState: AuthState | null;
  /** Current session token (opaque reference only) */
  sessionToken: OpaqueToken | null;
  /** Offline validation result (Story 5.4, AC1) */
  offlineValidation: OfflineValidationResult;
  /** Current degraded mode (Story 5.4, AC3) */
  degradedMode: DegradedMode;
  /** Last refresh attempt result (Story 5.4, AC5) */
  lastRefreshResult: RefreshResult | null;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Set auth state from Rust backend */
  setAuthState: (state: AuthState) => void;
  /** Set session token (opaque only) */
  setSessionToken: (token: OpaqueToken | null) => void;
  /** Set offline validation result (Story 5.4) */
  setOfflineValidation: (result: OfflineValidationResult) => void;
  /** Set degraded mode (Story 5.4) */
  setDegradedMode: (mode: DegradedMode) => void;
  /** Set refresh result (Story 5.4) */
  setRefreshResult: (result: RefreshResult | null) => void;
  /** Set refreshing state */
  setIsRefreshing: (isRefreshing: boolean) => void;
  /** Clear all auth state (logout) */
  clearAuthState: () => void;
}

/**
 * useCredentialStore
 *
 * MEMORY-ONLY store for credential state.
 * NEVER persisted to localStorage/sessionStorage.
 *
 * Per ADR-PRIVACY-001 pattern: sensitive/transient state in memory-only stores.
 * Resets to null on app restart - Rust backend is source of truth.
 *
 * Story 5.1: AC3
 * Story 5.4: AC1, AC3, AC6
 */
export const useCredentialStore = create<CredentialStoreState>((set) => ({
  authState: null,
  sessionToken: null,
  offlineValidation: DEFAULT_OFFLINE_VALIDATION,
  degradedMode: "RequiresReauth",
  lastRefreshResult: null,
  isRefreshing: false,

  setAuthState: (authState) => set({ authState }),

  setSessionToken: (sessionToken) => set({ sessionToken }),

  setOfflineValidation: (offlineValidation) =>
    set({
      offlineValidation,
      degradedMode: offlineValidation.mode,
    }),

  setDegradedMode: (degradedMode) => set({ degradedMode }),

  setRefreshResult: (lastRefreshResult) => set({ lastRefreshResult }),

  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),

  clearAuthState: () =>
    set({
      authState: null,
      sessionToken: null,
      offlineValidation: DEFAULT_OFFLINE_VALIDATION,
      degradedMode: "RequiresReauth",
      lastRefreshResult: null,
      isRefreshing: false,
    }),
}));

/**
 * Selector: Is the user authenticated?
 * Authenticated means: auth state is valid and not expired, AND offline mode allows access
 */
export const selectIsAuthenticated = (state: CredentialStoreState): boolean => {
  if (!state.authState) {
    return false;
  }
  if (state.authState.status === "NotStored") {
    return false;
  }
  if (state.authState.status === "Expired") {
    return state.offlineValidation.is_valid;
  }
  if (state.authState.status === "Invalid") {
    return false;
  }
  return true;
};

/**
 * Selector: Can perform write operations?
 * Only allowed in FullAccess mode
 */
export const selectCanWrite = (state: CredentialStoreState): boolean => {
  return state.degradedMode === "FullAccess";
};

/**
 * Selector: Is in read-only mode?
 */
export const selectIsReadOnly = (state: CredentialStoreState): boolean => {
  return state.degradedMode === "ReadOnly";
};

/**
 * Selector: Needs re-authentication?
 */
export const selectNeedsReauth = (state: CredentialStoreState): boolean => {
  return state.degradedMode === "RequiresReauth";
};
