/**
 * Hardware Store
 *
 * Zustand store for managing hardware capability detection and caching.
 * Memory-only storage (no persistence) - re-detects on app restart.
 * Implements 60-second polling for dynamic hardware changes (AC6).
 *
 * Story 2.1: Hardware Capability Detection
 * ADR-HARDWARE-001: Memory-only store (re-detect on startup)
 * ADR-HARDWARE-003: 60-second polling interval
 */

import type { HardwareCapabilities } from "@continuum/platform";
import { getHardwareCapabilities } from "@continuum/platform";
import { create } from "zustand";

/** Polling interval in milliseconds (60 seconds per ADR-HARDWARE-003) */
const POLLING_INTERVAL_MS = 60_000;

type HardwareState = {
  /** Detected hardware capabilities */
  capabilities: HardwareCapabilities | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if detection failed */
  error: string | null;
  /** Last successful update timestamp */
  lastUpdated: Date | null;
  /** Polling interval ID - use ReturnType for proper cross-environment typing (NFR-TS-1) */
  _pollingInterval: ReturnType<typeof setInterval> | undefined;

  /** Fetch hardware capabilities */
  fetchCapabilities: () => Promise<void>;
  /** Start polling for capability changes */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
};

/**
 * Hardware capability store (memory-only, no persist).
 * Detects RAM, GPU, storage for model recommendations.
 *
 * Story 2.1: Hardware Capability Detection
 * ADR-HARDWARE-001: Memory-only store (re-detect on startup)
 */
export const useHardwareStore = create<HardwareState>((set, get) => ({
  capabilities: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  _pollingInterval: undefined,

  fetchCapabilities: async () => {
    set({ isLoading: true, error: null });

    try {
      const capabilities = await getHardwareCapabilities();
      set({
        capabilities,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Hardware detection failed",
      });
    }
  },

  startPolling: () => {
    const state = get();
    if (state._pollingInterval !== undefined) {
      // Already polling
      return;
    }

    // Initial fetch
    state.fetchCapabilities();

    // Start interval (use setInterval without window prefix for cross-env compatibility)
    const intervalId = setInterval(() => {
      get().fetchCapabilities();
    }, POLLING_INTERVAL_MS);

    set({ _pollingInterval: intervalId });
  },

  stopPolling: () => {
    const state = get();
    if (state._pollingInterval !== undefined) {
      clearInterval(state._pollingInterval);
      set({ _pollingInterval: undefined });
    }
  },
}));
