/**
 * useDownloadProgressSubscription Hook
 * Story 2.3: Model Download Manager
 *
 * Centralized subscription to Tauri download progress events.
 * Must be mounted ONCE at app level (in providers) to avoid duplicate subscriptions.
 *
 * Each ModelDownloadButton was creating its own subscription, causing:
 * - N subscriptions for N model cards
 * - N store updates per progress event
 * - Cascading re-renders that paused downloads
 */

import type { DownloadProgress } from "@continuum/inference";
import { subscribeToDownloadProgress } from "@continuum/platform";
import { useEffect } from "react";
import { useDownloadStore } from "@/stores/downloads";

/**
 * Subscribe to download progress events and update the store.
 * MUST be rendered exactly once at app level.
 */
export function useDownloadProgressSubscription(): void {
  const updateProgress = useDownloadStore((s) => s.updateProgress);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function subscribe() {
      unsubscribe = await subscribeToDownloadProgress(
        (progress: DownloadProgress) => {
          if (mounted) {
            updateProgress(progress);
          }
        }
      );
    }

    subscribe();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [updateProgress]);
}
