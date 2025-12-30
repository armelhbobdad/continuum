/**
 * DownloadManager Component Tests
 * Story 2.3: Model Download Manager - Task 11
 *
 * Tests for download list and controls.
 * AC1-2: Download progress and controls
 */

import type { DownloadProgress as DownloadProgressData } from "@continuum/inference";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadManager } from "../download-manager";

// Mock platform module
vi.mock("@continuum/platform", () => ({
  pauseModelDownload: vi.fn(),
  resumeModelDownload: vi.fn(),
  cancelModelDownload: vi.fn(),
}));

// Mock download store
const mockSetDownloadStatus = vi.fn();
const mockRemoveDownload = vi.fn();
const mockActiveDownloads = new Map<string, DownloadProgressData>();

vi.mock("@/stores/downloads", () => ({
  useDownloadStore: (selector: (state: unknown) => unknown) => {
    const state = {
      activeDownloads: mockActiveDownloads,
      setDownloadStatus: mockSetDownloadStatus,
      removeDownload: mockRemoveDownload,
    };
    return selector(state);
  },
  selectActiveDownloads: (state: {
    activeDownloads: Map<string, DownloadProgressData>;
  }) => {
    const result: DownloadProgressData[] = [];
    for (const download of state.activeDownloads.values()) {
      if (!["completed", "failed", "cancelled"].includes(download.status)) {
        result.push(download);
      }
    }
    return result;
  },
}));

// Helper to create test download
function createDownload(
  overrides: Partial<DownloadProgressData> = {}
): DownloadProgressData {
  return {
    downloadId: `download-${Math.random().toString(36).slice(2)}`,
    modelId: "phi-3-mini",
    status: "downloading",
    bytesDownloaded: 512 * 1024 * 1024,
    totalBytes: 1024 * 1024 * 1024,
    speedBps: 10 * 1024 * 1024,
    etaSeconds: 52,
    startedAt: new Date(),
    ...overrides,
  };
}

describe("DownloadManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveDownloads.clear();
  });

  describe("Rendering", () => {
    it("should not render when no downloads and showEmptyState is false", () => {
      const { container } = render(<DownloadManager />);
      expect(
        container.querySelector('[data-slot="download-manager"]')
      ).not.toBeInTheDocument();
    });

    it("should show empty state message when showEmptyState is true", () => {
      render(<DownloadManager showEmptyState />);
      expect(screen.getByText("No active downloads")).toBeInTheDocument();
    });

    it("should render active downloads", () => {
      const download = createDownload({ modelId: "test-model-1" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(screen.getByText("test-model-1")).toBeInTheDocument();
      expect(screen.getByText("downloading")).toBeInTheDocument();
    });

    it("should have data-slot='download-manager'", () => {
      const download = createDownload();
      mockActiveDownloads.set(download.downloadId, download);

      const { container } = render(<DownloadManager />);

      expect(
        container.querySelector('[data-slot="download-manager"]')
      ).toBeInTheDocument();
    });

    it("should have aria-label='Active downloads'", () => {
      const download = createDownload();
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.getByRole("region", { name: "Active downloads" })
      ).toBeInTheDocument();
    });
  });

  describe("Controls - Downloading State", () => {
    it("should show pause button for downloading status", () => {
      const download = createDownload({ status: "downloading" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.getByRole("button", { name: "Pause download" })
      ).toBeInTheDocument();
    });

    it("should show cancel button for downloading status", () => {
      const download = createDownload({ status: "downloading" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.getByRole("button", { name: "Cancel download" })
      ).toBeInTheDocument();
    });

    it("should not show resume button for downloading status", () => {
      const download = createDownload({ status: "downloading" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.queryByRole("button", { name: "Resume download" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Controls - Paused State", () => {
    it("should show resume button for paused status", () => {
      const download = createDownload({ status: "paused" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.getByRole("button", { name: "Resume download" })
      ).toBeInTheDocument();
    });

    it("should show cancel button for paused status", () => {
      const download = createDownload({ status: "paused" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.getByRole("button", { name: "Cancel download" })
      ).toBeInTheDocument();
    });

    it("should not show pause button for paused status", () => {
      const download = createDownload({ status: "paused" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      expect(
        screen.queryByRole("button", { name: "Pause download" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Control Actions", () => {
    it("should call pauseModelDownload when pause clicked", async () => {
      const { pauseModelDownload } = await import("@continuum/platform");
      const download = createDownload({ status: "downloading" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      const pauseButton = screen.getByRole("button", {
        name: "Pause download",
      });
      fireEvent.click(pauseButton);

      expect(pauseModelDownload).toHaveBeenCalledWith(download.downloadId);
    });

    it("should call resumeModelDownload when resume clicked", async () => {
      const { resumeModelDownload } = await import("@continuum/platform");
      const download = createDownload({ status: "paused" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      const resumeButton = screen.getByRole("button", {
        name: "Resume download",
      });
      fireEvent.click(resumeButton);

      expect(resumeModelDownload).toHaveBeenCalledWith(download.downloadId);
    });

    it("should call cancelModelDownload when cancel clicked", async () => {
      const { cancelModelDownload } = await import("@continuum/platform");
      const download = createDownload({ status: "downloading" });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager />);

      const cancelButton = screen.getByRole("button", {
        name: "Cancel download",
      });
      fireEvent.click(cancelButton);

      expect(cancelModelDownload).toHaveBeenCalledWith(download.downloadId);
    });
  });

  describe("Status Filtering", () => {
    it("should not render completed downloads", () => {
      const download = createDownload({
        status: "completed",
        modelId: "completed-model",
      });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager showEmptyState />);

      // The selector filters out completed downloads
      expect(screen.queryByText("completed-model")).not.toBeInTheDocument();
      expect(screen.getByText("No active downloads")).toBeInTheDocument();
    });

    it("should not render failed downloads", () => {
      const download = createDownload({
        status: "failed",
        modelId: "failed-model",
      });
      mockActiveDownloads.set(download.downloadId, download);

      render(<DownloadManager showEmptyState />);

      // The selector filters out failed downloads
      expect(screen.queryByText("failed-model")).not.toBeInTheDocument();
      expect(screen.getByText("No active downloads")).toBeInTheDocument();
    });
  });

  describe("Multiple Downloads", () => {
    it("should render multiple active downloads", () => {
      const download1 = createDownload({ modelId: "model-1" });
      const download2 = createDownload({ modelId: "model-2" });
      mockActiveDownloads.set(download1.downloadId, download1);
      mockActiveDownloads.set(download2.downloadId, download2);

      render(<DownloadManager />);

      expect(screen.getByText("model-1")).toBeInTheDocument();
      expect(screen.getByText("model-2")).toBeInTheDocument();
    });
  });
});
