"use client";

/**
 * ModelDownloadButton Component
 * Story 2.3: Model Download Manager - Task 10
 *
 * Download button for ModelCard with status integration.
 * AC1-5: Full download lifecycle handling
 */

import { formatBytes, type ModelMetadata } from "@continuum/inference";
import {
  getPartialDownloadSize,
  resumeModelDownload,
} from "@continuum/platform";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Download, Loader2, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModelDownload } from "@/hooks/use-model-download";
import { cn } from "@/lib/utils";
import {
  selectIsModelDownloading,
  selectIsModelPaused,
  useDownloadStore,
} from "@/stores/downloads";
import { useModelStore } from "@/stores/models";
import { StorageWarning } from "./storage-warning";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        download: "bg-primary text-primary-foreground hover:bg-primary/90",
        resume:
          "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500",
        downloading: "cursor-wait bg-muted text-muted-foreground",
        paused:
          "bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500",
        downloaded:
          "border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
      },
    },
    defaultVariants: {
      variant: "download",
    },
  }
);

export type ModelDownloadButtonProps = VariantProps<typeof buttonVariants> & {
  /** Model to download */
  model: ModelMetadata;
  /** Download URL */
  downloadUrl: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * ModelDownloadButton Component
 *
 * Shows download/downloading/paused/downloaded state.
 * AC1-3: Progress display and controls
 * AC5: Storage validation
 */
export function ModelDownloadButton({
  model,
  downloadUrl,
  className,
}: ModelDownloadButtonProps) {
  const { state, initiateDownload, dismiss, storageResult } =
    useModelDownload();

  // Memoize the curried selectors to prevent infinite re-renders
  const isDownloadingSelector = useMemo(
    () => selectIsModelDownloading(model.id),
    [model.id]
  );
  const isPausedSelector = useMemo(
    () => selectIsModelPaused(model.id),
    [model.id]
  );

  // Get download status from global store (source of truth)
  const isDownloading = useDownloadStore(isDownloadingSelector);
  const isPaused = useDownloadStore(isPausedSelector);
  const downloadedModels = useModelStore((s) => s.downloadedModels);
  const removeDownload = useDownloadStore((s) => s.removeDownload);

  // Get the download ID for resume functionality
  const getDownloadByModelId = useDownloadStore((s) => s.getDownloadByModelId);

  // Track partial download size for resume functionality
  const [partialBytes, setPartialBytes] = useState<number | null>(null);

  // Check for existing partial downloads on mount
  useEffect(() => {
    let mounted = true;

    async function checkPartialDownload() {
      const size = await getPartialDownloadSize(model.id);
      if (mounted) {
        setPartialBytes(size);
      }
    }

    checkPartialDownload();

    return () => {
      mounted = false;
    };
  }, [model.id]);

  const isDownloaded = downloadedModels.includes(model.id);
  const hasPartialDownload = partialBytes !== null && partialBytes > 0;

  const handleDownload = async () => {
    await initiateDownload(
      model.id,
      downloadUrl,
      model.tokenizerUrl,
      model.requirements.storageMb,
      model.sha256
    );
  };

  const handleResume = useCallback(async () => {
    const download = getDownloadByModelId(model.id);
    if (download) {
      try {
        await resumeModelDownload(download.downloadId);
        // Remove old download entry - Rust creates a new one with new ID
        // The new download will be added via progress events
        removeDownload(download.downloadId);
      } catch (error) {
        console.error("Failed to resume download:", error);
      }
    }
  }, [getDownloadByModelId, model.id, removeDownload]);

  // Show downloaded state
  if (isDownloaded) {
    return (
      <button
        className={cn(buttonVariants({ variant: "downloaded" }), className)}
        disabled
        type="button"
      >
        <Check aria-hidden="true" className="h-4 w-4" />
        Downloaded
      </button>
    );
  }

  // Show downloading state (from store, not local state)
  if (isDownloading) {
    return (
      <button
        className={cn(buttonVariants({ variant: "downloading" }), className)}
        disabled
        type="button"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Downloading...
      </button>
    );
  }

  // Show paused state with resume button
  if (isPaused) {
    return (
      <button
        className={cn(buttonVariants({ variant: "paused" }), className)}
        onClick={handleResume}
        type="button"
      >
        <Play aria-hidden="true" className="h-4 w-4" />
        Resume
      </button>
    );
  }

  // Show storage warning
  if (state.status === "insufficient-storage" && storageResult) {
    return (
      <div className="space-y-2">
        <StorageWarning
          modelName={model.name}
          onCancel={dismiss}
          result={storageResult}
        />
      </div>
    );
  }

  // Show checking state (local state for pre-download phases)
  if (state.status === "checking-storage" || state.status === "starting") {
    return (
      <button
        className={cn(buttonVariants({ variant: "downloading" }), className)}
        disabled
        type="button"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        {state.status === "checking-storage" ? "Checking..." : "Starting..."}
      </button>
    );
  }

  // Show error state
  if (state.status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-red-600 text-xs dark:text-red-400">{state.error}</p>
        <button
          className={cn(buttonVariants({ variant: "download" }), className)}
          onClick={handleDownload}
          type="button"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Show resume button for partial downloads (file exists on disk)
  if (hasPartialDownload) {
    return (
      <button
        className={cn(buttonVariants({ variant: "resume" }), className)}
        onClick={handleDownload}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Resume ({formatBytes(partialBytes)})
      </button>
    );
  }

  // Default download button
  return (
    <button
      className={cn(buttonVariants({ variant: "download" }), className)}
      onClick={handleDownload}
      type="button"
    >
      <Download aria-hidden="true" className="h-4 w-4" />
      Download
    </button>
  );
}
