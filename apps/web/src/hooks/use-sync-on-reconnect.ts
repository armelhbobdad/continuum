"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConnectivityStore } from "@/stores/connectivity";
import { useSyncQueueStore } from "@/stores/sync-queue";
import { useConnectivityTransition } from "./use-connectivity-transition";

/** Max time to wait before starting sync (NFR14: 5 seconds) */
const MAX_SYNC_DELAY_MS = 5000;

export interface UseSyncOnReconnectResult {
  /** Manually trigger sync */
  triggerSync: () => Promise<void>;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending items */
  pendingCount: number;
}

/**
 * useSyncOnReconnect
 *
 * Automatically triggers sync when transitioning from offline to online.
 * Processes sync queue entries and updates connectivity store status.
 *
 * Story 4.5: AC5
 */
export function useSyncOnReconnect(): UseSyncOnReconnectResult {
  const {
    isOnline,
    isSyncing,
    setSyncing,
    updateLastSynced,
    setPendingSyncCount,
  } = useConnectivityStore();
  const {
    entries,
    markSyncing,
    markCompleted,
    markFailed,
    clearCompleted,
    getQueuedOperations,
  } = useSyncQueueStore();
  const { onTransitionEvent } = useConnectivityTransition();

  const syncTimerRef = useRef<number | undefined>(undefined);
  const isSyncingRef = useRef(false);

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  // Update store with pending count
  useEffect(() => {
    setPendingSyncCount(pendingCount);
  }, [pendingCount, setPendingSyncCount]);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !isOnline) {
      return;
    }

    const pending = getQueuedOperations();
    if (pending.length === 0) {
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      // Process each entry sequentially
      for (const entry of pending) {
        markSyncing(entry.id);

        try {
          // Simulate sync operation (real sync via Jazz CRDT in Epic 6)
          // For now, this just marks as completed
          await new Promise((resolve) => setTimeout(resolve, 100));

          markCompleted(entry.id);
        } catch (error) {
          markFailed(
            entry.id,
            error instanceof Error ? error.message : "Sync failed"
          );
          // Continue with remaining entries
        }
      }

      // Clear completed entries
      clearCompleted();
      updateLastSynced();
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [
    isOnline,
    getQueuedOperations,
    setSyncing,
    markSyncing,
    markCompleted,
    markFailed,
    clearCompleted,
    updateLastSynced,
  ]);

  // Subscribe to connectivity transitions
  useEffect(() => {
    const unsubscribe = onTransitionEvent((event) => {
      // Only sync when coming back online from offline
      if (
        event.type === "connectivity-change" &&
        !event.previousState.isOnline &&
        event.newState.isOnline
      ) {
        // Clear any pending timer
        if (syncTimerRef.current !== undefined) {
          window.clearTimeout(syncTimerRef.current);
        }

        // Start sync within MAX_SYNC_DELAY_MS (NFR14)
        syncTimerRef.current = window.setTimeout(
          () => {
            triggerSync();
          },
          Math.min(1000, MAX_SYNC_DELAY_MS)
        ); // Start quickly but allow settling
      }
    });

    return () => {
      unsubscribe();
      if (syncTimerRef.current !== undefined) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [onTransitionEvent, triggerSync]);

  return {
    triggerSync,
    isSyncing,
    pendingCount,
  };
}
