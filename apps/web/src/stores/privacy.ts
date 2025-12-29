/**
 * Privacy Store
 *
 * Zustand store for managing privacy mode state and network activity logging.
 * Memory-only storage - mode resets on app restart (user confirms choice each session).
 * Network log is never persisted, never synced (ADR-PRIVACY-004).
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 * Story 1.6: Privacy Dashboard MVP
 */
import { create } from "zustand";

/**
 * Privacy mode technical names mapped to user-facing labels:
 * - 'local-only'      → "Local-only" — "Your data never leaves this device"
 * - 'trusted-network' → "Hybrid"     — "Private by default, share when you choose"
 * - 'cloud-enhanced'  → "Cloud"      — "Maximum power, standard cloud privacy"
 */
export type PrivacyMode = "local-only" | "trusted-network" | "cloud-enhanced";

/**
 * Network request type for logging
 */
export type NetworkRequestType = "fetch" | "xhr" | "websocket" | "eventsource";

/**
 * Network log entry for tracking network activity
 * ADR-PRIVACY-004: Memory-only, never persisted, never synced
 */
export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  type: NetworkRequestType;
  url: string;
  blocked: boolean;
  reason?: string;
}

/**
 * Maximum number of log entries to keep (FIFO)
 */
const MAX_LOG_ENTRIES = 1000;

interface PrivacyState {
  /** Current privacy mode */
  mode: PrivacyMode;
  /** Key for JazzProvider remount on mode change */
  jazzKey: string;
  /** Network activity log (memory-only, never persisted) */
  networkLog: NetworkLogEntry[];
  /** Dashboard open state */
  isDashboardOpen: boolean;
  /** Update privacy mode and regenerate jazzKey */
  setMode: (mode: PrivacyMode) => void;
  /** Log a network request attempt */
  logNetworkAttempt: (entry: Omit<NetworkLogEntry, "id" | "timestamp">) => void;
  /** Clear the network log */
  clearNetworkLog: () => void;
  /** Toggle dashboard visibility */
  toggleDashboard: () => void;
  /** Open dashboard */
  openDashboard: () => void;
  /** Close dashboard */
  closeDashboard: () => void;
}

/**
 * Generate a unique jazzKey for the given mode.
 * The key includes mode name and timestamp to force JazzProvider remount.
 */
const generateJazzKey = (mode: PrivacyMode): string =>
  `jazz-${mode}-${Date.now()}`;

/**
 * Privacy store using Zustand.
 * Memory-only storage (no persistence middleware) per ADR-PRIVACY-001.
 * Network log is never persisted, never synced per ADR-PRIVACY-004.
 * Defaults to 'local-only' (most restrictive) per ADR-PRIVACY-003.
 */
export const usePrivacyStore = create<PrivacyState>((set) => ({
  mode: "local-only",
  jazzKey: generateJazzKey("local-only"),
  networkLog: [],
  isDashboardOpen: false,

  setMode: (mode) =>
    set({
      mode,
      jazzKey: generateJazzKey(mode),
    }),

  logNetworkAttempt: (entry) =>
    set((state) => ({
      networkLog: [
        { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
        ...state.networkLog,
      ].slice(0, MAX_LOG_ENTRIES),
    })),

  clearNetworkLog: () => set({ networkLog: [] }),

  toggleDashboard: () =>
    set((state) => ({ isDashboardOpen: !state.isDashboardOpen })),

  openDashboard: () => set({ isDashboardOpen: true }),

  closeDashboard: () => set({ isDashboardOpen: false }),
}));
