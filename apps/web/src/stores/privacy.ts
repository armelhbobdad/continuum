/**
 * Privacy Store
 *
 * Zustand store for managing privacy mode state.
 * Memory-only storage - mode resets on app restart (user confirms choice each session).
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 */
import { create } from "zustand";

/**
 * Privacy mode technical names mapped to user-facing labels:
 * - 'local-only'      → "Local-only" — "Your data never leaves this device"
 * - 'trusted-network' → "Hybrid"     — "Private by default, share when you choose"
 * - 'cloud-enhanced'  → "Cloud"      — "Maximum power, standard cloud privacy"
 */
export type PrivacyMode = "local-only" | "trusted-network" | "cloud-enhanced";

type PrivacyState = {
  /** Current privacy mode */
  mode: PrivacyMode;
  /** Key for JazzProvider remount on mode change */
  jazzKey: string;
  /** Update privacy mode and regenerate jazzKey */
  setMode: (mode: PrivacyMode) => void;
};

/**
 * Generate a unique jazzKey for the given mode.
 * The key includes mode name and timestamp to force JazzProvider remount.
 */
const generateJazzKey = (mode: PrivacyMode): string =>
  `jazz-${mode}-${Date.now()}`;

/**
 * Privacy store using Zustand.
 * Memory-only storage (no persistence middleware) per ADR-PRIVACY-001.
 * Defaults to 'local-only' (most restrictive) per ADR-PRIVACY-003.
 */
export const usePrivacyStore = create<PrivacyState>((set) => ({
  mode: "local-only",
  jazzKey: generateJazzKey("local-only"),
  setMode: (mode) =>
    set({
      mode,
      jazzKey: generateJazzKey(mode),
    }),
}));
