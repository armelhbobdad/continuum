/**
 * useDownloadCompletion Hook
 * Story 2.3: Model Download Manager - Task 10
 *
 * Monitors download completion and triggers:
 * - Notification on download complete/failed
 * - Model store update on download complete
 *
 * AC3: Download completion handling
 */

import type { DownloadProgress } from "@continuum/inference";
import { useEffect, useRef } from "react";
import {
  notifyDownloadComplete,
  notifyDownloadFailed,
} from "@/lib/notifications";
import { useDownloadStore } from "@/stores/downloads";
import { useModelStore } from "@/stores/models";

/**
 * Handle download status transition
 */
function handleStatusTransition(
  download: DownloadProgress,
  prevStatus: string | undefined,
  addDownloadedModel: (modelId: string) => void
): void {
  // Only handle transitions (not initial states)
  if (!prevStatus || prevStatus === download.status) {
    return;
  }

  if (download.status === "completed") {
    addDownloadedModel(download.modelId);
    notifyDownloadComplete(download.modelId);
  }

  if (download.status === "failed") {
    notifyDownloadFailed(
      download.modelId,
      download.error?.message ?? "Unknown error"
    );
  }
}

/**
 * Hook that monitors downloads and handles completion events.
 * Should be rendered once at app level (e.g., in providers).
 */
export function useDownloadCompletion(): void {
  const activeDownloads = useDownloadStore((s) => s.activeDownloads);
  const addDownloadedModel = useModelStore((s) => s.addDownloadedModel);
  const clearCompletedDownloads = useDownloadStore(
    (s) => s.clearCompletedDownloads
  );

  // Track previously seen statuses to detect transitions
  const prevStatusesRef = useRef<Map<string, string>>(new Map());

  // Monitor status transitions
  useEffect(() => {
    const prevStatuses = prevStatusesRef.current;

    for (const [downloadId, download] of activeDownloads) {
      handleStatusTransition(
        download,
        prevStatuses.get(downloadId),
        addDownloadedModel
      );
      prevStatuses.set(downloadId, download.status);
    }

    // Clean up removed downloads
    for (const downloadId of prevStatuses.keys()) {
      if (!activeDownloads.has(downloadId)) {
        prevStatuses.delete(downloadId);
      }
    }
  }, [activeDownloads, addDownloadedModel]);

  // Auto-clear completed downloads
  useEffect(() => {
    const hasCompleted = [...activeDownloads.values()].some(
      (d) => d.status === "completed"
    );

    if (hasCompleted) {
      const timer = setTimeout(clearCompletedDownloads, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeDownloads, clearCompletedDownloads]);
}
