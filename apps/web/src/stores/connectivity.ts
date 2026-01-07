import { create } from "zustand";
import type {
  PartialResponseState,
  TransitionState,
} from "@/types/connectivity-transition";

/**
 * Connectivity state interface.
 *
 * Tracks online/offline status with stability indicator for debouncing.
 * Story 4.4: Added transition state and partial response management.
 */
export interface ConnectivityState {
  /** Current online/offline status */
  isOnline: boolean;
  /** Whether status has been stable for 2+ seconds */
  isStable: boolean;
  /** Last connectivity check timestamp */
  lastChecked: Date | null;
  /** Current transition state (Story 4.4) */
  transitionState: TransitionState;
  /** Partial response preserved during interruption (Story 4.4) */
  partialResponse: PartialResponseState | null;
  /** Set online/offline status and update lastChecked */
  setOnline: (online: boolean) => void;
  /** Mark connectivity as stable (debounce complete) */
  markStable: () => void;
  /** Mark connectivity as unstable (during debounce) */
  markUnstable: () => void;
  /** Set transition state (Story 4.4) */
  setTransitionState: (state: TransitionState) => void;
  /** Preserve partial response during interruption (Story 4.4) */
  preservePartialResponse: (response: PartialResponseState) => void;
  /** Clear partial response after recovery (Story 4.4) */
  clearPartialResponse: () => void;
}

/**
 * Connectivity store - MEMORY ONLY (never persisted)
 *
 * Per ADR-PRIVACY-001 pattern: sensitive/transient state in memory-only stores.
 * Resets to optimistic online default on restart.
 *
 * Story 4.1: AC1, AC4
 * Story 4.4: Added transition state and partial response management
 */
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true, // Optimistic default
  isStable: true,
  lastChecked: null,
  transitionState: "stable",
  partialResponse: null,

  setOnline: (online) =>
    set({
      isOnline: online,
      lastChecked: new Date(),
    }),

  markStable: () => set({ isStable: true }),

  markUnstable: () => set({ isStable: false }),

  setTransitionState: (transitionState) => set({ transitionState }),

  preservePartialResponse: (response) => set({ partialResponse: response }),

  clearPartialResponse: () => set({ partialResponse: null }),
}));
