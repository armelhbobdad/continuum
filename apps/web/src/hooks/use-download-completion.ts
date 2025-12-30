/**
 * useDownloadCompletion Hook
 * Story 2.3: Model Download Manager - Task 10
 * Story 2.5: Model Integrity Verification
 *
 * Monitors download completion and triggers:
 * - Notification on download complete/failed
 * - Model store update on download complete
 * - Verification status update on verification success
 *
 * AC3: Download completion handling
 */

import type { DownloadProgress, VerificationInfo } from "@continuum/inference";
import { getModelMetadata } from "@continuum/inference";
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
  addDownloadedModel: (modelId: string) => void,
  setVerificationStatus: (modelId: string, info: VerificationInfo) => void
): void {
  // Only handle transitions (not initial states)
  if (!prevStatus || prevStatus === download.status) {
    return;
  }

  // Handle both "completed" (no hash) and "verified" (hash matched) as success
  if (download.status === "completed" || download.status === "verified") {
    addDownloadedModel(download.modelId);
    notifyDownloadComplete(download.modelId);

    // Story 2.5: Update verification status for verified downloads
    if (download.status === "verified") {
      const model = getModelMetadata(download.modelId);
      setVerificationStatus(download.modelId, {
        verified: true,
        timestamp: Date.now(),
        hash: model?.sha256 ?? "",
      });
    }
  }

  if (download.status === "failed") {
    notifyDownloadFailed(
      download.modelId,
      download.error?.message ?? "Unknown error"
    );
  }

  // Story 2.5: Handle corrupted status (verification failed)
  if (download.status === "corrupted") {
    notifyDownloadFailed(
      download.modelId,
      "Download verification failed - file may be corrupted"
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
  const setVerificationStatus = useModelStore((s) => s.setVerificationStatus);
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
        addDownloadedModel,
        setVerificationStatus
      );
      prevStatuses.set(downloadId, download.status);
    }

    // Clean up removed downloads
    for (const downloadId of prevStatuses.keys()) {
      if (!activeDownloads.has(downloadId)) {
        prevStatuses.delete(downloadId);
      }
    }
  }, [activeDownloads, addDownloadedModel, setVerificationStatus]);

  // Auto-clear completed/verified/corrupted downloads
  useEffect(() => {
    const hasCompleted = [...activeDownloads.values()].some(
      (d) =>
        d.status === "completed" ||
        d.status === "verified" ||
        d.status === "corrupted"
    );

    if (hasCompleted) {
      const timer = setTimeout(clearCompletedDownloads, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeDownloads, clearCompletedDownloads]);
}
