"use client";

/**
 * DownloadProgress Component
 * Story 2.3: Model Download Manager - Task 7
 *
 * Accessible progress bar for model downloads.
 * AC1: Shows percentage, bytes downloaded, ETA
 *
 * ADR-DOWNLOAD-003: Uses progress data from Tauri events
 */

import type { DownloadProgress as DownloadProgressData } from "@continuum/inference";
import {
  calculateProgressPercent,
  formatBytes,
  formatEta,
  formatSpeed,
} from "@continuum/inference";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * CVA variants for progress bar status
 */
const progressVariants = cva(
  "h-2 rounded-full transition-all duration-300 ease-out",
  {
    variants: {
      status: {
        queued: "bg-muted-foreground/50",
        downloading: "bg-primary",
        paused: "bg-yellow-500",
        verifying: "bg-blue-500", // Story 2.5: verification in progress
        verified: "bg-green-500", // Story 2.5: verification succeeded
        corrupted: "bg-red-500", // Story 2.5: verification failed
        completed: "bg-green-500",
        failed: "bg-red-500",
        cancelled: "bg-muted-foreground/30",
      },
    },
    defaultVariants: {
      status: "downloading",
    },
  }
);

export type DownloadProgressProps = VariantProps<typeof progressVariants> & {
  /** Download progress data */
  progress: DownloadProgressData;
  /** Model name for ARIA label */
  modelName?: string;
  /** Show detailed stats (speed, ETA) */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Get ARIA label based on download status
 */
function getAriaLabel(
  status: DownloadProgressData["status"],
  displayName: string,
  percent: number
): string {
  switch (status) {
    case "downloading":
      return `Downloading ${displayName}: ${percent}%`;
    case "paused":
      return `Download paused for ${displayName}: ${percent}%`;
    case "verifying":
      return `Verifying integrity of ${displayName}`;
    case "verified":
      return `Download verified for ${displayName}`;
    case "corrupted":
      return `Download corrupted for ${displayName}`;
    case "completed":
      return `Download complete for ${displayName}`;
    case "failed":
      return `Download failed for ${displayName}`;
    default:
      return `Download ${status} for ${displayName}`;
  }
}

/**
 * DownloadProgress Component
 *
 * Accessible progress bar with ARIA attributes.
 * AC1: Displays percentage, downloaded size, and ETA
 */
export function DownloadProgress({
  progress,
  modelName,
  showDetails = true,
  className,
}: DownloadProgressProps) {
  const percent = calculateProgressPercent(progress);
  const displayName = modelName ?? progress.modelId;
  const ariaLabel = getAriaLabel(progress.status, displayName, percent);

  return (
    <div className={cn("space-y-1", className)} data-slot="download-progress">
      {/* Progress bar container */}
      <div className="overflow-hidden rounded-full bg-secondary">
        {/* Progress bar track */}
        <div
          aria-label={ariaLabel}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percent}
          className={cn(progressVariants({ status: progress.status }))}
          role="progressbar"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Progress details */}
      {showDetails ? <ProgressDetails progress={progress} /> : null}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

type ProgressDetailsProps = {
  progress: DownloadProgressData;
};

/**
 * Progress details showing bytes, speed, ETA
 */
function ProgressDetails({ progress }: ProgressDetailsProps) {
  return (
    <div className="flex items-center justify-between text-muted-foreground text-xs">
      {/* Bytes downloaded / total */}
      <span>
        {formatBytes(progress.bytesDownloaded)} /{" "}
        {formatBytes(progress.totalBytes)}
      </span>

      {/* Speed and ETA */}
      <StatusIndicator progress={progress} />
    </div>
  );
}

type StatusIndicatorProps = {
  progress: DownloadProgressData;
};

/**
 * Status indicator showing speed/ETA or status text
 */
function StatusIndicator({ progress }: StatusIndicatorProps) {
  const { status, speedBps, etaSeconds } = progress;

  if (status === "downloading") {
    return (
      <div className="flex items-center gap-2">
        {speedBps > 0 ? <span>{formatSpeed(speedBps)}</span> : null}
        {etaSeconds > 0 ? (
          <span>~{formatEta(etaSeconds)} remaining</span>
        ) : null}
      </div>
    );
  }

  if (status === "paused") {
    return <span className="text-yellow-600 dark:text-yellow-400">Paused</span>;
  }

  if (status === "verifying") {
    return (
      <span className="text-blue-600 dark:text-blue-400">
        Verifying integrity...
      </span>
    );
  }

  if (status === "verified") {
    return <span className="text-green-600 dark:text-green-400">Verified</span>;
  }

  if (status === "corrupted") {
    return <span className="text-red-600 dark:text-red-400">Corrupted</span>;
  }

  if (status === "completed") {
    return <span className="text-green-600 dark:text-green-400">Complete</span>;
  }

  if (status === "failed") {
    return <span className="text-red-600 dark:text-red-400">Failed</span>;
  }

  return null;
}
