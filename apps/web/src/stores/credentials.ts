"use client";

import { create } from "zustand";
import type { AuthState, OpaqueToken } from "@/types/credentials";

/**
 * Credential Store State (Story 5.1)
 *
 * SECURITY: This store is MEMORY-ONLY (never persisted).
 * It holds ONLY opaque tokens, never raw credentials.
 * All sensitive credentials remain in Rust backend.
 *
 * AC3: No credentials in web storage (localStorage, sessionStorage, cookies)
 */
export interface CredentialStoreState {
  /** Current auth state (opaque, no secrets) */
  authState: AuthState | null;
  /** Current session token (opaque reference only) */
  sessionToken: OpaqueToken | null;
  /** Set auth state from Rust backend */
  setAuthState: (state: AuthState) => void;
  /** Set session token (opaque only) */
  setSessionToken: (token: OpaqueToken | null) => void;
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
 */
export const useCredentialStore = create<CredentialStoreState>((set) => ({
  authState: null,
  sessionToken: null,

  setAuthState: (authState) => set({ authState }),

  setSessionToken: (sessionToken) => set({ sessionToken }),

  clearAuthState: () =>
    set({
      authState: null,
      sessionToken: null,
    }),
}));
