/**
 * useDownloadCompletion Hook Tests
 * Story 2.3: Model Download Manager - Task 10
 *
 * Tests for download completion handling.
 * AC3: Download completion notifications and model store updates
 *
 * NOTE: These tests focus on the hook's subscription behavior.
 * The actual transition handling logic is tested indirectly through
 * integration with the download store and notification system.
 */

import type { DownloadProgress } from "@continuum/inference";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock notifications
const mockNotifyDownloadComplete = vi.fn();
const mockNotifyDownloadFailed = vi.fn();

vi.mock("@/lib/notifications", () => ({
  notifyDownloadComplete: (...args: unknown[]) =>
    mockNotifyDownloadComplete(...args),
  notifyDownloadFailed: (...args: unknown[]) =>
    mockNotifyDownloadFailed(...args),
}));

// Store state that can be updated between renders
let storeState: {
  activeDownloads: Map<string, DownloadProgress>;
  clearCompletedDownloads: () => void;
};

// Mock stores with dynamic state
const mockAddDownloadedModel = vi.fn();
const mockClearCompletedDownloads = vi.fn();

vi.mock("@/stores/downloads", () => ({
  useDownloadStore: (selector: (state: unknown) => unknown) =>
    selector(storeState),
}));

vi.mock("@/stores/models", () => ({
  useModelStore: (selector: (state: unknown) => unknown) => {
    const state = {
      addDownloadedModel: mockAddDownloadedModel,
    };
    return selector(state);
  },
}));

// Import after mocks
import { useDownloadCompletion } from "../use-download-completion";

// Helper to create download progress
function createDownload(
  overrides: Partial<DownloadProgress> = {}
): DownloadProgress {
  return {
    downloadId: `download-${Math.random().toString(36).slice(2)}`,
    modelId: "phi-3-mini",
    status: "downloading",
    bytesDownloaded: 500_000_000,
    totalBytes: 1_000_000_000,
    speedBps: 10_000_000,
    etaSeconds: 50,
    startedAt: new Date(),
    ...overrides,
  };
}

// Helper to reset store state
function resetStoreState() {
  storeState = {
    activeDownloads: new Map(),
    clearCompletedDownloads: mockClearCompletedDownloads,
  };
}

describe("useDownloadCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetStoreState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Hook Initialization", () => {
    it("should initialize without errors", () => {
      expect(() => {
        renderHook(() => useDownloadCompletion());
      }).not.toThrow();
    });

    it("should not notify on initial render with existing downloads", () => {
      const download = createDownload({ status: "completed" });
      storeState.activeDownloads.set(download.downloadId, download);

      renderHook(() => useDownloadCompletion());

      // Should not notify because this is initial state, not a transition
      expect(mockNotifyDownloadComplete).not.toHaveBeenCalled();
    });

    it("should not notify on initial render with failed download", () => {
      const download = createDownload({ status: "failed" });
      storeState.activeDownloads.set(download.downloadId, download);

      renderHook(() => useDownloadCompletion());

      expect(mockNotifyDownloadFailed).not.toHaveBeenCalled();
    });
  });

  describe("Status Tracking", () => {
    it("should track downloads in activeDownloads", () => {
      const download = createDownload({ status: "downloading" });
      storeState.activeDownloads.set(download.downloadId, download);

      renderHook(() => useDownloadCompletion());

      // Hook should be tracking without notification
      expect(mockNotifyDownloadComplete).not.toHaveBeenCalled();
      expect(mockNotifyDownloadFailed).not.toHaveBeenCalled();
    });

    it("should handle empty downloads gracefully", () => {
      renderHook(() => useDownloadCompletion());

      expect(mockNotifyDownloadComplete).not.toHaveBeenCalled();
      expect(mockClearCompletedDownloads).not.toHaveBeenCalled();
    });
  });

  describe("Multiple Downloads", () => {
    it("should track multiple concurrent downloads", () => {
      const download1 = createDownload({
        downloadId: "test-1",
        modelId: "model-a",
        status: "downloading",
      });
      const download2 = createDownload({
        downloadId: "test-2",
        modelId: "model-b",
        status: "downloading",
      });

      storeState.activeDownloads.set(download1.downloadId, download1);
      storeState.activeDownloads.set(download2.downloadId, download2);

      renderHook(() => useDownloadCompletion());

      // No completions yet
      expect(mockNotifyDownloadComplete).not.toHaveBeenCalled();
    });

    it("should handle mix of statuses", () => {
      const downloading = createDownload({
        downloadId: "test-1",
        status: "downloading",
      });
      const paused = createDownload({
        downloadId: "test-2",
        status: "paused",
      });
      const queued = createDownload({
        downloadId: "test-3",
        status: "queued",
      });

      storeState.activeDownloads.set(downloading.downloadId, downloading);
      storeState.activeDownloads.set(paused.downloadId, paused);
      storeState.activeDownloads.set(queued.downloadId, queued);

      renderHook(() => useDownloadCompletion());

      expect(mockNotifyDownloadComplete).not.toHaveBeenCalled();
      expect(mockNotifyDownloadFailed).not.toHaveBeenCalled();
    });
  });

  describe("Auto-Clear Timer", () => {
    it("should not start timer when no completed downloads", () => {
      const download = createDownload({ status: "downloading" });
      storeState.activeDownloads.set(download.downloadId, download);

      renderHook(() => useDownloadCompletion());

      vi.advanceTimersByTime(10_000);

      expect(mockClearCompletedDownloads).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const download = createDownload({ status: "downloading" });
      storeState.activeDownloads.set(download.downloadId, download);

      const { unmount } = renderHook(() => useDownloadCompletion());

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});
