/**
 * useModelDownload Hook
 * Story 2.3: Model Download Manager - Task 8/10
 *
 * Provides download functionality with pre-download storage validation.
 * AC5: Storage space validation before download
 * AC1-3: Download progress and controls
 *
 * NOTE: Progress subscription is handled centrally by useDownloadProgressSubscription
 * in providers.tsx to avoid duplicate subscriptions from multiple ModelDownloadButtons.
 */

import type { StorageCheckResult } from "@continuum/inference";
import { checkStorageSpace, startModelDownload } from "@continuum/platform";
import { useCallback, useState } from "react";
import { useDownloadStore } from "@/stores/downloads";

type DownloadState =
  | { status: "idle" }
  | { status: "checking-storage" }
  | { status: "insufficient-storage"; result: StorageCheckResult }
  | { status: "starting" }
  | { status: "downloading"; downloadId: string }
  | { status: "error"; error: string };

type UseModelDownloadResult = {
  /** Current download state */
  state: DownloadState;
  /** Initiate download with storage check */
  initiateDownload: (
    modelId: string,
    url: string,
    tokenizerUrl: string,
    requiredMb: number,
    sha256?: string
  ) => Promise<void>;
  /** Retry after storage warning */
  retryDownload: () => Promise<void>;
  /** Cancel/dismiss the current operation */
  dismiss: () => void;
  /** Storage check result (if available) */
  storageResult: StorageCheckResult | null;
};

/**
 * Hook for managing model download with storage validation.
 * Progress updates come from the centralized subscription in providers.
 */
export function useModelDownload(): UseModelDownloadResult {
  const [state, setState] = useState<DownloadState>({ status: "idle" });
  const [storageResult, setStorageResult] = useState<StorageCheckResult | null>(
    null
  );
  const [pendingDownload, setPendingDownload] = useState<{
    modelId: string;
    url: string;
    tokenizerUrl: string;
    requiredMb: number;
    sha256?: string;
  } | null>(null);

  const addDownload = useDownloadStore((s) => s.addDownload);

  const initiateDownload = useCallback(
    async (
      modelId: string,
      url: string,
      tokenizerUrl: string,
      requiredMb: number,
      sha256?: string
    ) => {
      // Save for potential retry
      setPendingDownload({ modelId, url, tokenizerUrl, requiredMb, sha256 });

      // Check storage first
      setState({ status: "checking-storage" });

      try {
        const result = await checkStorageSpace(requiredMb);
        setStorageResult(result);

        if (!result.hasSpace) {
          setState({ status: "insufficient-storage", result });
          return;
        }

        // Start download with optional hash for verification (Story 2.5)
        setState({ status: "starting" });

        const downloadId = await startModelDownload(
          modelId,
          url,
          tokenizerUrl,
          sha256
        );

        // Add to store
        addDownload({
          downloadId,
          modelId,
          status: "downloading",
          bytesDownloaded: 0,
          totalBytes: requiredMb * 1024 * 1024,
          speedBps: 0,
          etaSeconds: 0,
          startedAt: new Date(),
        });

        setState({ status: "downloading", downloadId });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Download failed";
        setState({ status: "error", error: message });
      }
    },
    [addDownload]
  );

  const retryDownload = useCallback(async () => {
    if (pendingDownload) {
      await initiateDownload(
        pendingDownload.modelId,
        pendingDownload.url,
        pendingDownload.tokenizerUrl,
        pendingDownload.requiredMb,
        pendingDownload.sha256
      );
    }
  }, [pendingDownload, initiateDownload]);

  const dismiss = useCallback(() => {
    setState({ status: "idle" });
    setStorageResult(null);
    setPendingDownload(null);
  }, []);

  return {
    state,
    initiateDownload,
    retryDownload,
    dismiss,
    storageResult,
  };
}
