/**
 * useNetworkRecovery Hook
 * Story 2.3: Model Download Manager - AC4
 *
 * Monitors network connectivity and auto-resumes paused downloads
 * when connectivity returns.
 *
 * AC4: Network Recovery
 * - When network connection drops during download → handled by Rust backend
 * - When connectivity returns → this hook resumes paused downloads automatically
 */

import {
  isOnline,
  resumeModelDownload,
  subscribeToNetworkStatus,
} from "@continuum/platform";
import { useEffect, useRef } from "react";
import { useDownloadStore } from "@/stores/downloads";

/**
 * Hook that monitors network connectivity and auto-resumes downloads.
 * Should be rendered once at app level (e.g., in providers).
 *
 * AC4: When connectivity returns, downloads resume automatically
 */
export function useNetworkRecovery(): void {
  const activeDownloads = useDownloadStore((s) => s.activeDownloads);
  const setDownloadStatus = useDownloadStore((s) => s.setDownloadStatus);

  // Track if we were previously offline
  const wasOfflineRef = useRef(!isOnline());

  useEffect(() => {
    const handleNetworkChange = async (online: boolean) => {
      // Only act when transitioning from offline to online
      if (online && wasOfflineRef.current) {
        // Find all paused downloads and resume them
        const pausedDownloads = [...activeDownloads.values()].filter(
          (d) => d.status === "paused"
        );

        for (const download of pausedDownloads) {
          try {
            await resumeModelDownload(download.downloadId);
            setDownloadStatus(download.downloadId, "downloading");
          } catch (error) {
            // Log but don't throw - continue with other downloads
            console.error(
              `Failed to auto-resume download ${download.downloadId}:`,
              error
            );
          }
        }
      }

      wasOfflineRef.current = !online;
    };

    const unsubscribe = subscribeToNetworkStatus(handleNetworkChange);

    return unsubscribe;
  }, [activeDownloads, setDownloadStatus]);
}
