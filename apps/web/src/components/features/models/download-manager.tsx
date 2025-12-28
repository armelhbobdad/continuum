"use client";

/**
 * DownloadManager Component
 * Story 2.3: Model Download Manager - Task 6
 *
 * Displays and manages active model downloads.
 * AC1: Download progress display
 * AC2: Pause/resume/cancel controls
 * AC3: Download completion handling
 *
 * ADR-DOWNLOAD-001: Memory-only state (no persistence)
 * ADR-DOWNLOAD-003: Subscribes to Tauri events
 */

import type { DownloadProgress as DownloadProgressData } from "@continuum/inference";
import { DOWNLOAD_ERROR_MESSAGES } from "@continuum/inference";
import {
  cancelModelDownload,
  pauseModelDownload,
  resumeModelDownload,
} from "@continuum/platform";
import { cva, type VariantProps } from "class-variance-authority";
import { Pause, Play, X } from "lucide-react";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { selectActiveDownloads, useDownloadStore } from "@/stores/downloads";
import { DownloadProgress } from "./download-progress";

/**
 * CVA variants for download item status
 */
const downloadItemVariants = cva("rounded-lg border p-3 transition-colors", {
  variants: {
    status: {
      queued: "border-muted bg-muted/30",
      downloading: "border-primary/50 bg-primary/5",
      paused: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
      completed: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
      failed: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
      cancelled: "border-muted bg-muted/20",
    },
  },
  defaultVariants: {
    status: "downloading",
  },
});

export type DownloadManagerProps = {
  /** Additional CSS classes */
  className?: string;
  /** Show empty state when no downloads */
  showEmptyState?: boolean;
};

/**
 * DownloadManager Component
 *
 * Lists active downloads with controls.
 * AC1: Progress display
 * AC2: Pause/resume/cancel
 */
export function DownloadManager({
  className,
  showEmptyState = false,
}: DownloadManagerProps) {
  // Use useShallow to prevent infinite re-renders from array reference changes
  const activeDownloads = useDownloadStore(useShallow(selectActiveDownloads));
  const setDownloadStatus = useDownloadStore((s) => s.setDownloadStatus);
  const removeDownload = useDownloadStore((s) => s.removeDownload);

  const handlePause = useCallback(
    async (downloadId: string) => {
      try {
        await pauseModelDownload(downloadId);
        setDownloadStatus(downloadId, "paused");
      } catch (error) {
        console.error("Failed to pause download:", error);
      }
    },
    [setDownloadStatus]
  );

  const handleResume = useCallback(
    async (downloadId: string) => {
      try {
        await resumeModelDownload(downloadId);
        setDownloadStatus(downloadId, "downloading");
      } catch (error) {
        console.error("Failed to resume download:", error);
      }
    },
    [setDownloadStatus]
  );

  const handleCancel = useCallback(
    async (downloadId: string) => {
      try {
        await cancelModelDownload(downloadId);
        removeDownload(downloadId);
      } catch (error) {
        console.error("Failed to cancel download:", error);
      }
    },
    [removeDownload]
  );

  if (activeDownloads.length === 0 && !showEmptyState) {
    return null;
  }

  return (
    <section
      aria-label="Active downloads"
      className={cn("space-y-3", className)}
      data-slot="download-manager"
    >
      {activeDownloads.length === 0 && showEmptyState && (
        <p className="text-center text-muted-foreground text-sm">
          No active downloads
        </p>
      )}

      {activeDownloads.map((download) => (
        <DownloadItem
          download={download}
          key={download.downloadId}
          onCancel={handleCancel}
          onPause={handlePause}
          onResume={handleResume}
        />
      ))}
    </section>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

type DownloadItemProps = VariantProps<typeof downloadItemVariants> & {
  download: DownloadProgressData;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
};

/**
 * Individual download item with controls
 */
function DownloadItem({
  download,
  onPause,
  onResume,
  onCancel,
}: DownloadItemProps) {
  const isPausable = download.status === "downloading";
  const isResumable = download.status === "paused";
  const isCancellable =
    download.status === "downloading" ||
    download.status === "paused" ||
    download.status === "queued";

  return (
    <article
      aria-labelledby={`download-${download.downloadId}-model`}
      className={downloadItemVariants({ status: download.status })}
      data-slot="download-item"
    >
      <div className="flex items-start justify-between gap-2">
        {/* Model info */}
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-medium text-sm"
            id={`download-${download.downloadId}-model`}
          >
            {download.modelId}
          </h3>
          <span className="text-muted-foreground text-xs capitalize">
            {download.status}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {isPausable ? (
            <button
              aria-label="Pause download"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onPause(download.downloadId)}
              type="button"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : null}
          {isResumable ? (
            <button
              aria-label="Resume download"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onResume(download.downloadId)}
              type="button"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : null}
          {isCancellable ? (
            <button
              aria-label="Cancel download"
              className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onCancel(download.downloadId)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <DownloadProgress
          modelName={download.modelId}
          progress={download}
          showDetails
        />
      </div>

      {/* Error message */}
      {download.status === "failed" && download.error && (
        <div className="mt-2 text-red-600 text-xs dark:text-red-400">
          <p>{download.error.message}</p>
          <p className="text-muted-foreground">
            {DOWNLOAD_ERROR_MESSAGES[download.error.code]?.recoveryHint}
          </p>
        </div>
      )}
    </article>
  );
}
