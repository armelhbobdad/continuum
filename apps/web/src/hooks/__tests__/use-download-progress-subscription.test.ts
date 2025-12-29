/**
 * useDownloadProgressSubscription Hook Tests
 * Story 2.3: Model Download Manager
 *
 * Tests for centralized Tauri download progress event subscription.
 * AC1: Progress updates from backend
 */

import type { DownloadProgress } from "@continuum/inference";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock platform module
type ProgressCallback = (progress: DownloadProgress) => void;
let capturedCallback: ProgressCallback | null = null;
const mockUnsubscribe = vi.fn();

vi.mock("@continuum/platform", () => ({
  subscribeToDownloadProgress: vi.fn(async (callback: ProgressCallback) => {
    capturedCallback = callback;
    return mockUnsubscribe;
  }),
}));

// Mock download store
const mockUpdateProgress = vi.fn();

vi.mock("@/stores/downloads", () => ({
  useDownloadStore: (selector: (state: unknown) => unknown) => {
    const state = {
      updateProgress: mockUpdateProgress,
    };
    return selector(state);
  },
}));

// Import after mocks
import { useDownloadProgressSubscription } from "../use-download-progress-subscription";

describe("useDownloadProgressSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallback = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Subscription Lifecycle", () => {
    it("should subscribe to progress events on mount", async () => {
      const { subscribeToDownloadProgress } = await import(
        "@continuum/platform"
      );

      renderHook(() => useDownloadProgressSubscription());

      // Wait for async subscription
      await vi.waitFor(() => {
        expect(subscribeToDownloadProgress).toHaveBeenCalled();
      });
    });

    it("should unsubscribe on unmount", async () => {
      const { unmount } = renderHook(() => useDownloadProgressSubscription());

      // Wait for subscription to complete
      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("Progress Updates", () => {
    it("should update store when progress event received", async () => {
      renderHook(() => useDownloadProgressSubscription());

      // Wait for subscription
      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const progress: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "downloading",
        bytesDownloaded: 500_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 10_000_000,
        etaSeconds: 50,
        startedAt: new Date(),
      };

      act(() => {
        capturedCallback?.(progress);
      });

      expect(mockUpdateProgress).toHaveBeenCalledWith(progress);
    });

    it("should handle multiple progress updates", async () => {
      renderHook(() => useDownloadProgressSubscription());

      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const progress1: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "downloading",
        bytesDownloaded: 100_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 10_000_000,
        etaSeconds: 90,
        startedAt: new Date(),
      };

      const progress2: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "downloading",
        bytesDownloaded: 500_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 10_000_000,
        etaSeconds: 50,
        startedAt: new Date(),
      };

      act(() => {
        capturedCallback?.(progress1);
        capturedCallback?.(progress2);
      });

      expect(mockUpdateProgress).toHaveBeenCalledTimes(2);
      expect(mockUpdateProgress).toHaveBeenNthCalledWith(1, progress1);
      expect(mockUpdateProgress).toHaveBeenNthCalledWith(2, progress2);
    });

    it("should not update store after unmount", async () => {
      const { unmount } = renderHook(() => useDownloadProgressSubscription());

      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const savedCallback = capturedCallback;
      unmount();

      // Try to call after unmount
      const progress: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "downloading",
        bytesDownloaded: 500_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 10_000_000,
        etaSeconds: 50,
        startedAt: new Date(),
      };

      act(() => {
        savedCallback?.(progress);
      });

      // Should not have been called because mounted flag is false
      expect(mockUpdateProgress).not.toHaveBeenCalled();
    });
  });

  describe("Status Transitions", () => {
    it("should handle completed status", async () => {
      renderHook(() => useDownloadProgressSubscription());

      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const progress: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "completed",
        bytesDownloaded: 1_000_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 0,
        etaSeconds: 0,
        startedAt: new Date(),
      };

      act(() => {
        capturedCallback?.(progress);
      });

      expect(mockUpdateProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" })
      );
    });

    it("should handle failed status", async () => {
      renderHook(() => useDownloadProgressSubscription());

      await vi.waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const progress: DownloadProgress = {
        downloadId: "test-123",
        modelId: "phi-3-mini",
        status: "failed",
        bytesDownloaded: 500_000_000,
        totalBytes: 1_000_000_000,
        speedBps: 0,
        etaSeconds: 0,
        startedAt: new Date(),
        error: {
          code: "NETWORK_ERROR",
          message: "Connection lost",
          retryable: true,
        },
      };

      act(() => {
        capturedCallback?.(progress);
      });

      expect(mockUpdateProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error: expect.objectContaining({ code: "NETWORK_ERROR" }),
        })
      );
    });
  });
});
