/**
 * Download Store Tests
 * Story 2.3: Model Download Manager - Task 2
 * Tests for download store state management
 */

import type { DownloadProgress } from "@continuum/inference";
import { beforeEach, describe, expect, it } from "vitest";
import {
  selectActiveDownloads,
  selectDownloadById,
  selectIsModelDownloading,
  useDownloadStore,
} from "../downloads";

describe("useDownloadStore", () => {
  // Helper to create mock download progress
  const createMockProgress = (
    overrides: Partial<DownloadProgress> = {}
  ): DownloadProgress => ({
    downloadId: `download-${Math.random().toString(36).slice(2)}`,
    modelId: "phi-3-mini",
    status: "downloading" as const,
    bytesDownloaded: 500_000_000,
    totalBytes: 2_500_000_000,
    speedBps: 10_000_000,
    etaSeconds: 200,
    startedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    // Reset store state before each test
    useDownloadStore.setState({
      activeDownloads: new Map(),
      downloadQueue: [],
      isInitializing: false,
    });
  });

  describe("Initial State", () => {
    it("should have empty activeDownloads initially", () => {
      const state = useDownloadStore.getState();
      expect(state.activeDownloads.size).toBe(0);
    });

    it("should have empty downloadQueue initially", () => {
      const state = useDownloadStore.getState();
      expect(state.downloadQueue).toEqual([]);
    });

    it("should not be initializing initially", () => {
      const state = useDownloadStore.getState();
      expect(state.isInitializing).toBe(false);
    });
  });

  describe("updateProgress", () => {
    it("should add new download progress to activeDownloads", () => {
      const progress = createMockProgress({ downloadId: "test-123" });

      useDownloadStore.getState().updateProgress(progress);

      const state = useDownloadStore.getState();
      expect(state.activeDownloads.get("test-123")).toEqual(progress);
    });

    it("should update existing download progress", () => {
      const initialProgress = createMockProgress({
        downloadId: "test-123",
        bytesDownloaded: 100,
      });
      const updatedProgress = createMockProgress({
        downloadId: "test-123",
        bytesDownloaded: 500,
      });

      useDownloadStore.getState().updateProgress(initialProgress);
      useDownloadStore.getState().updateProgress(updatedProgress);

      const state = useDownloadStore.getState();
      expect(state.activeDownloads.get("test-123")?.bytesDownloaded).toBe(500);
    });

    it("should handle multiple concurrent downloads", () => {
      const progress1 = createMockProgress({
        downloadId: "download-1",
        modelId: "model-a",
      });
      const progress2 = createMockProgress({
        downloadId: "download-2",
        modelId: "model-b",
      });

      useDownloadStore.getState().updateProgress(progress1);
      useDownloadStore.getState().updateProgress(progress2);

      const state = useDownloadStore.getState();
      expect(state.activeDownloads.size).toBe(2);
      expect(state.activeDownloads.get("download-1")?.modelId).toBe("model-a");
      expect(state.activeDownloads.get("download-2")?.modelId).toBe("model-b");
    });
  });

  describe("clearCompletedDownloads", () => {
    it("should remove completed downloads", () => {
      const completedProgress = createMockProgress({
        downloadId: "completed-1",
        status: "completed" as const,
      });
      const downloadingProgress = createMockProgress({
        downloadId: "downloading-1",
        status: "downloading" as const,
      });

      useDownloadStore.getState().updateProgress(completedProgress);
      useDownloadStore.getState().updateProgress(downloadingProgress);
      useDownloadStore.getState().clearCompletedDownloads();

      const state = useDownloadStore.getState();
      expect(state.activeDownloads.has("completed-1")).toBe(false);
      expect(state.activeDownloads.has("downloading-1")).toBe(true);
    });

    it("should remove failed downloads", () => {
      const failedProgress = createMockProgress({
        downloadId: "failed-1",
        status: "failed" as const,
      });

      useDownloadStore.getState().updateProgress(failedProgress);
      useDownloadStore.getState().clearCompletedDownloads();

      expect(useDownloadStore.getState().activeDownloads.has("failed-1")).toBe(
        false
      );
    });

    it("should remove cancelled downloads", () => {
      const cancelledProgress = createMockProgress({
        downloadId: "cancelled-1",
        status: "cancelled" as const,
      });

      useDownloadStore.getState().updateProgress(cancelledProgress);
      useDownloadStore.getState().clearCompletedDownloads();

      expect(
        useDownloadStore.getState().activeDownloads.has("cancelled-1")
      ).toBe(false);
    });

    it("should keep queued and paused downloads", () => {
      const queuedProgress = createMockProgress({
        downloadId: "queued-1",
        status: "queued" as const,
      });
      const pausedProgress = createMockProgress({
        downloadId: "paused-1",
        status: "paused" as const,
      });

      useDownloadStore.getState().updateProgress(queuedProgress);
      useDownloadStore.getState().updateProgress(pausedProgress);
      useDownloadStore.getState().clearCompletedDownloads();

      const state = useDownloadStore.getState();
      expect(state.activeDownloads.has("queued-1")).toBe(true);
      expect(state.activeDownloads.has("paused-1")).toBe(true);
    });
  });

  describe("getDownloadByModelId", () => {
    it("should return download by model ID", () => {
      const progress = createMockProgress({
        downloadId: "test-123",
        modelId: "phi-3-mini",
      });

      useDownloadStore.getState().updateProgress(progress);

      const download = useDownloadStore
        .getState()
        .getDownloadByModelId("phi-3-mini");
      expect(download?.downloadId).toBe("test-123");
    });

    it("should return undefined for non-existent model", () => {
      const download = useDownloadStore
        .getState()
        .getDownloadByModelId("non-existent");
      expect(download).toBeUndefined();
    });
  });

  describe("queueDownload", () => {
    it("should add model ID to queue", () => {
      useDownloadStore.getState().queueDownload("model-1");

      const state = useDownloadStore.getState();
      expect(state.downloadQueue).toContain("model-1");
    });

    it("should not add duplicate model ID to queue", () => {
      useDownloadStore.getState().queueDownload("model-1");
      useDownloadStore.getState().queueDownload("model-1");

      const state = useDownloadStore.getState();
      expect(state.downloadQueue.filter((id) => id === "model-1").length).toBe(
        1
      );
    });

    it("should maintain queue order", () => {
      useDownloadStore.getState().queueDownload("model-1");
      useDownloadStore.getState().queueDownload("model-2");
      useDownloadStore.getState().queueDownload("model-3");

      const state = useDownloadStore.getState();
      expect(state.downloadQueue).toEqual(["model-1", "model-2", "model-3"]);
    });
  });

  describe("removeFromQueue", () => {
    it("should remove model ID from queue", () => {
      useDownloadStore.getState().queueDownload("model-1");
      useDownloadStore.getState().queueDownload("model-2");
      useDownloadStore.getState().removeFromQueue("model-1");

      const state = useDownloadStore.getState();
      expect(state.downloadQueue).toEqual(["model-2"]);
    });

    it("should handle removing non-existent model ID", () => {
      useDownloadStore.getState().queueDownload("model-1");
      useDownloadStore.getState().removeFromQueue("non-existent");

      const state = useDownloadStore.getState();
      expect(state.downloadQueue).toEqual(["model-1"]);
    });
  });

  describe("setDownloadStatus", () => {
    it("should update download status to paused", () => {
      const progress = createMockProgress({
        downloadId: "test-123",
        status: "downloading" as const,
      });

      useDownloadStore.getState().updateProgress(progress);
      useDownloadStore.getState().setDownloadStatus("test-123", "paused");

      const download = useDownloadStore
        .getState()
        .activeDownloads.get("test-123");
      expect(download?.status).toBe("paused");
    });

    it("should handle non-existent download ID gracefully", () => {
      // Should not throw
      useDownloadStore.getState().setDownloadStatus("non-existent", "paused");

      expect(useDownloadStore.getState().activeDownloads.size).toBe(0);
    });
  });

  describe("removeDownload", () => {
    it("should remove download from activeDownloads", () => {
      const progress = createMockProgress({ downloadId: "test-123" });

      useDownloadStore.getState().updateProgress(progress);
      useDownloadStore.getState().removeDownload("test-123");

      expect(useDownloadStore.getState().activeDownloads.has("test-123")).toBe(
        false
      );
    });
  });

  describe("addDownload", () => {
    it("should add download to activeDownloads", () => {
      const progress = createMockProgress({ downloadId: "test-123" });

      useDownloadStore.getState().addDownload(progress);

      expect(useDownloadStore.getState().activeDownloads.has("test-123")).toBe(
        true
      );
    });
  });

  describe("Selectors", () => {
    describe("selectActiveDownloads", () => {
      it("should return only non-completed downloads", () => {
        const downloadingProgress = createMockProgress({
          downloadId: "downloading-1",
          status: "downloading" as const,
        });
        const completedProgress = createMockProgress({
          downloadId: "completed-1",
          status: "completed" as const,
        });
        const pausedProgress = createMockProgress({
          downloadId: "paused-1",
          status: "paused" as const,
        });

        useDownloadStore.getState().updateProgress(downloadingProgress);
        useDownloadStore.getState().updateProgress(completedProgress);
        useDownloadStore.getState().updateProgress(pausedProgress);

        const activeDownloads = selectActiveDownloads(
          useDownloadStore.getState()
        );

        expect(activeDownloads.length).toBe(2);
        expect(
          activeDownloads.some((d) => d.downloadId === "downloading-1")
        ).toBe(true);
        expect(activeDownloads.some((d) => d.downloadId === "paused-1")).toBe(
          true
        );
        expect(
          activeDownloads.some((d) => d.downloadId === "completed-1")
        ).toBe(false);
      });
    });

    describe("selectDownloadById", () => {
      it("should return download by ID", () => {
        const progress = createMockProgress({ downloadId: "test-123" });

        useDownloadStore.getState().updateProgress(progress);

        const download = selectDownloadById("test-123")(
          useDownloadStore.getState()
        );
        expect(download?.downloadId).toBe("test-123");
      });

      it("should return undefined for non-existent ID", () => {
        const download = selectDownloadById("non-existent")(
          useDownloadStore.getState()
        );
        expect(download).toBeUndefined();
      });
    });

    describe("selectIsModelDownloading", () => {
      it("should return true for downloading model", () => {
        const progress = createMockProgress({
          modelId: "phi-3-mini",
          status: "downloading" as const,
        });

        useDownloadStore.getState().updateProgress(progress);

        expect(
          selectIsModelDownloading("phi-3-mini")(useDownloadStore.getState())
        ).toBe(true);
      });

      it("should return true for queued model", () => {
        const progress = createMockProgress({
          modelId: "phi-3-mini",
          status: "queued" as const,
        });

        useDownloadStore.getState().updateProgress(progress);

        expect(
          selectIsModelDownloading("phi-3-mini")(useDownloadStore.getState())
        ).toBe(true);
      });

      it("should return false for paused model", () => {
        const progress = createMockProgress({
          modelId: "phi-3-mini",
          status: "paused" as const,
        });

        useDownloadStore.getState().updateProgress(progress);

        expect(
          selectIsModelDownloading("phi-3-mini")(useDownloadStore.getState())
        ).toBe(false);
      });

      it("should return false for completed model", () => {
        const progress = createMockProgress({
          modelId: "phi-3-mini",
          status: "completed" as const,
        });

        useDownloadStore.getState().updateProgress(progress);

        expect(
          selectIsModelDownloading("phi-3-mini")(useDownloadStore.getState())
        ).toBe(false);
      });

      it("should return false for non-existent model", () => {
        expect(
          selectIsModelDownloading("non-existent")(useDownloadStore.getState())
        ).toBe(false);
      });
    });
  });

  describe("Memory-Only Store (ADR-DOWNLOAD-001)", () => {
    it("should not have persist middleware", () => {
      const store = useDownloadStore;

      // @ts-expect-error - checking for absence of persist
      expect(store.persist).toBeUndefined();
    });
  });
});
