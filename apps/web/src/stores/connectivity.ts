import { create } from "zustand";

/**
 * Connectivity state interface.
 *
 * Tracks online/offline status with stability indicator for debouncing.
 */
export interface ConnectivityState {
  /** Current online/offline status */
  isOnline: boolean;
  /** Whether status has been stable for 2+ seconds */
  isStable: boolean;
  /** Last connectivity check timestamp */
  lastChecked: Date | null;
  /** Set online/offline status and update lastChecked */
  setOnline: (online: boolean) => void;
  /** Mark connectivity as stable (debounce complete) */
  markStable: () => void;
  /** Mark connectivity as unstable (during debounce) */
  markUnstable: () => void;
}

/**
 * Connectivity store - MEMORY ONLY (never persisted)
 *
 * Per ADR-PRIVACY-001 pattern: sensitive/transient state in memory-only stores.
 * Resets to optimistic online default on restart.
 *
 * Story 4.1: AC1, AC4
 */
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true, // Optimistic default
  isStable: true,
  lastChecked: null,

  setOnline: (online) =>
    set({
      isOnline: online,
      lastChecked: new Date(),
    }),

  markStable: () => set({ isStable: true }),

  markUnstable: () => set({ isStable: false }),
}));
