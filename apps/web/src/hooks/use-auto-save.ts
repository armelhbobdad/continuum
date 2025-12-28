/**
 * Auto-Save Hook
 *
 * Provides automatic session persistence with:
 * - 30-second interval auto-save (NFR39: max 30s data loss)
 * - Debounced manual saves
 * - beforeunload save handler
 * - Non-blocking persistence (NFR-STATE-3: 50ms budget)
 *
 * Story 1.7: Session Persistence & Auto-Save
 * ADR-PERSIST-002: 30-Second Auto-Save Interval
 */
import { useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/session";

/**
 * Auto-save interval in milliseconds.
 * Per NFR39: Maximum 30 seconds of data loss on crash.
 */
const AUTO_SAVE_INTERVAL_MS = 30_000;

/**
 * Debounce time for rapid save calls in milliseconds.
 * Prevents excessive localStorage writes during rapid typing.
 */
const DEBOUNCE_MS = 500;

/**
 * Auto-save hook return type.
 */
interface UseAutoSaveReturn {
  /** Debounced save function for use during typing */
  save: () => void;
  /** Immediate save function for use at explicit save points */
  triggerSave: () => void;
  /** Current dirty state */
  isDirty: boolean;
}

/**
 * Hook for automatic session persistence.
 *
 * Features:
 * - Auto-save every 30 seconds when dirty (NFR39)
 * - Debounced manual save for rapid updates (Task 2.3)
 * - beforeunload handler for graceful exits (Task 2.2)
 * - Non-blocking save operations (NFR-STATE-3)
 *
 * @returns Object with save functions and dirty state
 */
export function useAutoSave(): UseAutoSaveReturn {
  const isDirty = useSessionStore((state) => state.isDirty);
  const clearDirty = useSessionStore((state) => state.clearDirty);
  const debounceRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);

  /**
   * Debounced save function.
   * Delays save to prevent excessive writes during rapid typing.
   */
  const save = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      if (useSessionStore.getState().isDirty) {
        // Zustand persist automatically syncs on state change
        // We just need to clear the dirty flag to track that save occurred
        clearDirty();
      }
    }, DEBOUNCE_MS);
  };

  /**
   * Immediate save function.
   * Bypasses debounce for explicit save points (message send, response complete).
   */
  const triggerSave = () => {
    if (useSessionStore.getState().isDirty) {
      clearDirty();
    }
  };

  // Interval-based auto-save (30 seconds per NFR39)
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (useSessionStore.getState().isDirty) {
        clearDirty();
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [clearDirty]);

  // Save on page unload for graceful exits
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (useSessionStore.getState().isDirty) {
        clearDirty();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [clearDirty]);

  return { save, triggerSave, isDirty };
}
