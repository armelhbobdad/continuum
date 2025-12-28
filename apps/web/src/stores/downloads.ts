/**
 * Download Store
 *
 * Zustand store for managing model download state.
 * Memory-only storage (no persistence) - downloads are transient state.
 * Network log is never persisted per ADR-PRIVACY-004.
 *
 * Story 2.3: Model Download Manager
 * ADR-DOWNLOAD-001: Memory-only store (ADR-PRIVACY-004 compliance)
 */

import type { DownloadProgress } from "@continuum/inference";
import { create } from "zustand";

interface DownloadState {
  /** Active downloads (keyed by downloadId) */
  activeDownloads: Map<string, DownloadProgress>;
  /** Queue of model IDs waiting to download */
  downloadQueue: string[];
  /** Overall loading state */
  isInitializing: boolean;

  /** Update progress from Tauri event (AC1) */
  updateProgress: (progress: DownloadProgress) => void;
  /** Clear completed/failed/cancelled downloads from view */
  clearCompletedDownloads: () => void;
  /** Get download by model ID */
  getDownloadByModelId: (modelId: string) => DownloadProgress | undefined;
  /** Add model to download queue */
  queueDownload: (modelId: string) => void;
  /** Remove model from queue */
  removeFromQueue: (modelId: string) => void;
  /** Set download status (for pause/resume/cancel) */
  setDownloadStatus: (
    downloadId: string,
    status: DownloadProgress["status"]
  ) => void;
  /** Remove a download completely */
  removeDownload: (downloadId: string) => void;
  /** Add a new download to active downloads */
  addDownload: (progress: DownloadProgress) => void;
}

/**
 * Download store (memory-only, no persist).
 * Tracks active downloads and queue.
 *
 * Story 2.3: Model Download Manager
 * ADR-DOWNLOAD-001: Memory-only (ADR-PRIVACY-004 compliance)
 */
export const useDownloadStore = create<DownloadState>((set, get) => ({
  activeDownloads: new Map(),
  downloadQueue: [],
  isInitializing: false,

  updateProgress: (progress: DownloadProgress) => {
    set((state) => {
      const downloads = new Map(state.activeDownloads);
      downloads.set(progress.downloadId, progress);
      return { activeDownloads: downloads };
    });
  },

  clearCompletedDownloads: () => {
    set((state) => {
      const downloads = new Map(state.activeDownloads);
      for (const [id, download] of downloads) {
        if (["completed", "failed", "cancelled"].includes(download.status)) {
          downloads.delete(id);
        }
      }
      return { activeDownloads: downloads };
    });
  },

  getDownloadByModelId: (modelId: string) => {
    const downloads = get().activeDownloads;
    for (const download of downloads.values()) {
      if (download.modelId === modelId) return download;
    }
    return;
  },

  queueDownload: (modelId: string) => {
    set((state) => {
      if (state.downloadQueue.includes(modelId)) {
        return state;
      }
      return {
        downloadQueue: [...state.downloadQueue, modelId],
      };
    });
  },

  removeFromQueue: (modelId: string) => {
    set((state) => ({
      downloadQueue: state.downloadQueue.filter((id) => id !== modelId),
    }));
  },

  setDownloadStatus: (
    downloadId: string,
    status: DownloadProgress["status"]
  ) => {
    set((state) => {
      const downloads = new Map(state.activeDownloads);
      const download = downloads.get(downloadId);
      if (download) {
        downloads.set(downloadId, { ...download, status });
      }
      return { activeDownloads: downloads };
    });
  },

  removeDownload: (downloadId: string) => {
    set((state) => {
      const downloads = new Map(state.activeDownloads);
      downloads.delete(downloadId);
      return { activeDownloads: downloads };
    });
  },

  addDownload: (progress: DownloadProgress) => {
    set((state) => {
      const downloads = new Map(state.activeDownloads);
      downloads.set(progress.downloadId, progress);
      return { activeDownloads: downloads };
    });
  },
}));

/**
 * Selector for active (non-completed) downloads
 */
export const selectActiveDownloads = (state: DownloadState) => {
  const result: DownloadProgress[] = [];
  for (const download of state.activeDownloads.values()) {
    if (!["completed", "failed", "cancelled"].includes(download.status)) {
      result.push(download);
    }
  }
  return result;
};

/**
 * Selector for download by ID
 */
export const selectDownloadById =
  (downloadId: string) => (state: DownloadState) =>
    state.activeDownloads.get(downloadId);

/**
 * Selector for checking if a model is downloading
 */
export const selectIsModelDownloading =
  (modelId: string) => (state: DownloadState) => {
    for (const download of state.activeDownloads.values()) {
      if (
        download.modelId === modelId &&
        (download.status === "downloading" || download.status === "queued")
      ) {
        return true;
      }
    }
    return false;
  };

/**
 * Selector for checking if a model download is paused
 */
export const selectIsModelPaused =
  (modelId: string) => (state: DownloadState) => {
    for (const download of state.activeDownloads.values()) {
      if (download.modelId === modelId && download.status === "paused") {
        return true;
      }
    }
    return false;
  };
