"use client";

/**
 * Privacy Keyboard Shortcuts Hook
 *
 * Enables keyboard shortcuts for switching privacy modes:
 * - Cmd/Ctrl + 1: Local-only mode
 * - Cmd/Ctrl + 2: Hybrid (trusted-network) mode
 * - Cmd/Ctrl + 3: Cloud-enhanced mode
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 */
import { useEffect } from "react";
import type { PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

/**
 * Keyboard shortcuts mapping
 */
const PRIVACY_SHORTCUTS: Record<string, PrivacyMode> = {
  "1": "local-only",
  "2": "trusted-network",
  "3": "cloud-enhanced",
};

/**
 * Hook to enable privacy mode keyboard shortcuts.
 *
 * Must be used within a component tree that has access to the privacy store.
 * Shortcuts work across the entire application when this hook is active.
 */
export function usePrivacyKeyboardShortcuts(): void {
  const setMode = usePrivacyStore((state) => state.setMode);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const mode = PRIVACY_SHORTCUTS[event.key];

      if (mode) {
        event.preventDefault();
        setMode(mode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setMode]);
}

export { PRIVACY_SHORTCUTS };
