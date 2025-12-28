/**
 * useNetworkRecovery Hook Tests
 * Story 2.3: Model Download Manager - AC4
 *
 * Tests for network recovery and auto-resume functionality.
 * AC4: Automatic resume when connectivity returns
 */

import type { DownloadProgress } from "@continuum/inference";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock platform module
type NetworkCallback = (online: boolean) => void;
let capturedNetworkCallback: NetworkCallback | null = null;
const mockUnsubscribe = vi.fn();
const mockResumeModelDownload = vi.fn();
let mockIsOnline = true;

vi.mock("@continuum/platform", () => ({
  isOnline: () => mockIsOnline,
  subscribeToNetworkStatus: vi.fn((callback: NetworkCallback) => {
    capturedNetworkCallback = callback;
    return mockUnsubscribe;
  }),
  resumeModelDownload: (...args: unknown[]) => mockResumeModelDownload(...args),
}));

// Mock download store
const mockSetDownloadStatus = vi.fn();
let mockActiveDownloads = new Map<string, DownloadProgress>();

vi.mock("@/stores/downloads", () => ({
  useDownloadStore: (selector: (state: unknown) => unknown) => {
    const state = {
      activeDownloads: mockActiveDownloads,
      setDownloadStatus: mockSetDownloadStatus,
    };
    return selector(state);
  },
}));

// Import after mocks
import { useNetworkRecovery } from "../use-network-recovery";

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

describe("useNetworkRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedNetworkCallback = null;
    mockActiveDownloads = new Map();
    mockIsOnline = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Subscription Lifecycle", () => {
    it("should subscribe to network status on mount", async () => {
      const { subscribeToNetworkStatus } = await import("@continuum/platform");

      renderHook(() => useNetworkRecovery());

      expect(subscribeToNetworkStatus).toHaveBeenCalled();
    });

    it("should unsubscribe on unmount", () => {
      const { unmount } = renderHook(() => useNetworkRecovery());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("Network Recovery (AC4)", () => {
    it("should resume paused downloads when going online", async () => {
      mockIsOnline = false; // Start offline

      const pausedDownload = createDownload({
        downloadId: "test-123",
        status: "paused",
      });
      mockActiveDownloads.set(pausedDownload.downloadId, pausedDownload);

      mockResumeModelDownload.mockResolvedValue(undefined);

      renderHook(() => useNetworkRecovery());

      // Simulate going online
      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).toHaveBeenCalledWith("test-123");
      expect(mockSetDownloadStatus).toHaveBeenCalledWith(
        "test-123",
        "downloading"
      );
    });

    it("should resume multiple paused downloads", async () => {
      mockIsOnline = false;

      const paused1 = createDownload({
        downloadId: "test-1",
        status: "paused",
      });
      const paused2 = createDownload({
        downloadId: "test-2",
        status: "paused",
      });

      mockActiveDownloads.set(paused1.downloadId, paused1);
      mockActiveDownloads.set(paused2.downloadId, paused2);

      mockResumeModelDownload.mockResolvedValue(undefined);

      renderHook(() => useNetworkRecovery());

      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).toHaveBeenCalledWith("test-1");
      expect(mockResumeModelDownload).toHaveBeenCalledWith("test-2");
    });

    it("should not resume non-paused downloads", async () => {
      mockIsOnline = false;

      const downloading = createDownload({
        downloadId: "test-1",
        status: "downloading",
      });
      const completed = createDownload({
        downloadId: "test-2",
        status: "completed",
      });
      const paused = createDownload({
        downloadId: "test-3",
        status: "paused",
      });

      mockActiveDownloads.set(downloading.downloadId, downloading);
      mockActiveDownloads.set(completed.downloadId, completed);
      mockActiveDownloads.set(paused.downloadId, paused);

      mockResumeModelDownload.mockResolvedValue(undefined);

      renderHook(() => useNetworkRecovery());

      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).toHaveBeenCalledTimes(1);
      expect(mockResumeModelDownload).toHaveBeenCalledWith("test-3");
    });

    it("should not resume when already online", async () => {
      mockIsOnline = true; // Already online

      const pausedDownload = createDownload({
        downloadId: "test-123",
        status: "paused",
      });
      mockActiveDownloads.set(pausedDownload.downloadId, pausedDownload);

      renderHook(() => useNetworkRecovery());

      // Receive online status but wasn't offline before
      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).not.toHaveBeenCalled();
    });

    it("should track offline state correctly", async () => {
      mockIsOnline = true;

      const pausedDownload = createDownload({
        downloadId: "test-123",
        status: "paused",
      });
      mockActiveDownloads.set(pausedDownload.downloadId, pausedDownload);

      mockResumeModelDownload.mockResolvedValue(undefined);

      renderHook(() => useNetworkRecovery());

      // Go offline
      await act(async () => {
        capturedNetworkCallback!(false);
      });

      expect(mockResumeModelDownload).not.toHaveBeenCalled();

      // Go back online - should now resume
      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).toHaveBeenCalledWith("test-123");
    });
  });

  describe("Error Handling", () => {
    it("should continue with other downloads if one fails to resume", async () => {
      mockIsOnline = false;

      const paused1 = createDownload({
        downloadId: "test-1",
        status: "paused",
      });
      const paused2 = createDownload({
        downloadId: "test-2",
        status: "paused",
      });

      mockActiveDownloads.set(paused1.downloadId, paused1);
      mockActiveDownloads.set(paused2.downloadId, paused2);

      // First resume fails, second succeeds
      mockResumeModelDownload
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(undefined);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderHook(() => useNetworkRecovery());

      await act(async () => {
        capturedNetworkCallback!(true);
      });

      // Both should have been attempted
      expect(mockResumeModelDownload).toHaveBeenCalledTimes(2);

      // Only the successful one should update status
      expect(mockSetDownloadStatus).toHaveBeenCalledWith(
        "test-2",
        "downloading"
      );

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("No Downloads", () => {
    it("should handle empty downloads gracefully", async () => {
      mockIsOnline = false;
      mockActiveDownloads = new Map();

      renderHook(() => useNetworkRecovery());

      await act(async () => {
        capturedNetworkCallback!(true);
      });

      expect(mockResumeModelDownload).not.toHaveBeenCalled();
    });
  });
});
