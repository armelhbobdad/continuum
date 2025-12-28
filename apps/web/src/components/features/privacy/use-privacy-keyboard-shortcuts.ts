"use client";

/**
 * Privacy Keyboard Shortcuts Hook
 *
 * Enables keyboard shortcuts for switching privacy modes:
 * - Cmd/Ctrl + 1: Local-only mode
 * - Cmd/Ctrl + 2: Hybrid (trusted-network) mode
 * - Cmd/Ctrl + 3: Cloud-enhanced mode
 * - Cmd/Ctrl + Shift + P: Toggle Privacy Dashboard (Story 1.6)
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 * Story 1.6: Privacy Dashboard MVP
 */
import { useEffect } from "react";
import type { PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

/**
 * Keyboard shortcuts mapping for mode switching
 */
const PRIVACY_MODE_SHORTCUTS: Record<string, PrivacyMode> = {
  "1": "local-only",
  "2": "trusted-network",
  "3": "cloud-enhanced",
};

/**
 * Hook to enable privacy keyboard shortcuts.
 *
 * Must be used within a component tree that has access to the privacy store.
 * Shortcuts work across the entire application when this hook is active.
 *
 * Mode switching: Cmd/Ctrl + 1/2/3
 * Dashboard toggle: Cmd/Ctrl + Shift + P
 */
export function usePrivacyKeyboardShortcuts(): void {
  const setMode = usePrivacyStore((state) => state.setMode);
  const toggleDashboard = usePrivacyStore((state) => state.toggleDashboard);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const hasModifier = event.metaKey || event.ctrlKey;

      if (!hasModifier) {
        return;
      }

      // Check for Cmd/Ctrl + Shift + P (toggle Privacy Dashboard)
      if (event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        toggleDashboard();
        return;
      }

      // Check for Cmd/Ctrl + 1/2/3 (switch mode)
      const mode = PRIVACY_MODE_SHORTCUTS[event.key];
      if (mode) {
        event.preventDefault();
        setMode(mode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setMode, toggleDashboard]);
}

// Legacy export for backwards compatibility
export const PRIVACY_SHORTCUTS = PRIVACY_MODE_SHORTCUTS;
