/**
 * useCorruptionDialog Hook
 * Story 2.5: Model Integrity Verification
 *
 * Subscribes to Tauri corruption events and manages dialog state.
 * Shows CorruptionDialog when verification fails.
 *
 * AC3: Corrupted File Handling
 */

import type { CorruptionEvent } from "@continuum/platform";
import { subscribeToCorruptionEvents } from "@continuum/platform";
import { useCallback, useEffect, useState } from "react";

export interface CorruptionDialogState {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Corruption event data (null when closed) */
  corruption: CorruptionEvent | null;
  /** Close the dialog */
  close: () => void;
  /** Re-download the corrupted model */
  redownload: () => void;
  /** View quarantine folder */
  viewQuarantine: () => void;
}

/**
 * Hook that subscribes to corruption events and manages dialog state.
 * Should be mounted once at app level.
 */
export function useCorruptionDialog(): CorruptionDialogState {
  const [corruption, setCorruption] = useState<CorruptionEvent | null>(null);

  // Subscribe to corruption events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function subscribe() {
      unsubscribe = await subscribeToCorruptionEvents((event) => {
        if (mounted) {
          setCorruption(event);
        }
      });
    }

    subscribe();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const close = useCallback(() => {
    setCorruption(null);
  }, []);

  const redownload = useCallback(() => {
    // TODO: Implement re-download by triggering a new download
    // This would need to call startModelDownload again
    // For now, just close the dialog
    setCorruption(null);
  }, []);

  const viewQuarantine = useCallback(() => {
    // TODO: Implement view quarantine
    // Could open the quarantine folder or show a quarantine list UI
    // For now, just close the dialog
    setCorruption(null);
  }, []);

  return {
    isOpen: corruption !== null,
    corruption,
    close,
    redownload,
    viewQuarantine,
  };
}
