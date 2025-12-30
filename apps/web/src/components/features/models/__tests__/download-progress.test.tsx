/**
 * DownloadProgress Component Tests
 * Story 2.3: Model Download Manager - Task 11
 *
 * Tests for accessible progress bar component.
 * AC1: Progress display with percentage, bytes, ETA
 */

import type { DownloadProgress as DownloadProgressData } from "@continuum/inference";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DownloadProgress } from "../download-progress";

// Top-level regex patterns for performance
const SIZE_512_MB_PATTERN = /512\.0 MB/;
const SIZE_1_GB_PATTERN = /1\.00 GB/;
const REMAINING_PATTERN = /remaining/i;

// Helper to create test progress data
function createProgress(
  overrides: Partial<DownloadProgressData> = {}
): DownloadProgressData {
  return {
    downloadId: "test-download-123",
    modelId: "phi-3-mini",
    status: "downloading",
    bytesDownloaded: 512 * 1024 * 1024, // 512 MB
    totalBytes: 1024 * 1024 * 1024, // 1 GB
    speedBps: 10 * 1024 * 1024, // 10 MB/s
    etaSeconds: 52,
    startedAt: new Date(),
    ...overrides,
  };
}

describe("DownloadProgress", () => {
  describe("ARIA Accessibility", () => {
    it("should render with role='progressbar'", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    it("should have correct aria-valuenow for 50% progress", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    });

    it("should have aria-valuemin='0' and aria-valuemax='100'", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    });

    it("should have descriptive aria-label for downloading status", () => {
      const progress = createProgress();
      render(<DownloadProgress modelName="Phi-3 Mini" progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Downloading Phi-3 Mini: 50%"
      );
    });

    it("should have correct aria-label for paused status", () => {
      const progress = createProgress({ status: "paused" });
      render(<DownloadProgress modelName="Phi-3 Mini" progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Download paused for Phi-3 Mini: 50%"
      );
    });

    it("should have correct aria-label for completed status", () => {
      const progress = createProgress({ status: "completed" });
      render(<DownloadProgress modelName="Phi-3 Mini" progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Download complete for Phi-3 Mini"
      );
    });

    it("should have correct aria-label for failed status", () => {
      const progress = createProgress({ status: "failed" });
      render(<DownloadProgress modelName="Phi-3 Mini" progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Download failed for Phi-3 Mini"
      );
    });
  });

  describe("Progress Display", () => {
    it("should display bytes downloaded and total", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText(SIZE_512_MB_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(SIZE_1_GB_PATTERN)).toBeInTheDocument();
    });

    it("should display download speed when downloading", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText("10.0 MB/s")).toBeInTheDocument();
    });

    it("should display ETA when downloading", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText(REMAINING_PATTERN)).toBeInTheDocument();
    });

    it("should display 'Paused' when status is paused", () => {
      const progress = createProgress({ status: "paused" });
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("should display 'Complete' when status is completed", () => {
      const progress = createProgress({ status: "completed" });
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should display 'Failed' when status is failed", () => {
      const progress = createProgress({ status: "failed" });
      render(<DownloadProgress progress={progress} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("should hide details when showDetails is false", () => {
      const progress = createProgress();
      render(<DownloadProgress progress={progress} showDetails={false} />);

      expect(screen.queryByText(SIZE_512_MB_PATTERN)).not.toBeInTheDocument();
      expect(screen.queryByText("10.0 MB/s")).not.toBeInTheDocument();
    });
  });

  describe("Progress Calculation", () => {
    it("should show 0% for no progress", () => {
      const progress = createProgress({ bytesDownloaded: 0 });
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });

    it("should show 100% for complete download", () => {
      const progress = createProgress({
        bytesDownloaded: 1024 * 1024 * 1024,
        status: "completed",
      });
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });

    it("should handle zero total bytes gracefully", () => {
      const progress = createProgress({
        bytesDownloaded: 0,
        totalBytes: 0,
      });
      render(<DownloadProgress progress={progress} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });
  });

  describe("CVA Variants", () => {
    it("should have data-slot='download-progress'", () => {
      const progress = createProgress();
      const { container } = render(<DownloadProgress progress={progress} />);

      expect(
        container.querySelector('[data-slot="download-progress"]')
      ).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const progress = createProgress();
      const { container } = render(
        <DownloadProgress className="custom-class" progress={progress} />
      );

      expect(
        container.querySelector('[data-slot="download-progress"]')
      ).toHaveClass("custom-class");
    });
  });
});
