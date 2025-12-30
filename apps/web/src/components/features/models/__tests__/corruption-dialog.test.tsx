/**
 * CorruptionDialog Tests
 * Story 2.5: Model Integrity Verification
 *
 * Tests for AC3: Corrupted File Handling
 * - Dialog displays expected vs actual hash
 * - Re-download and View Quarantine actions
 * - Close functionality
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorruptionDialog } from "../corruption-dialog";

// Top-level regex patterns for performance
const APPEARS_CORRUPTED_PATTERN = /appears to be corrupted/i;
const NETWORK_INTERRUPTION_PATTERN = /network interruption/i;
const DISK_STORAGE_ERRORS_PATTERN = /disk storage errors/i;
const FILE_TAMPERING_PATTERN = /file tampering/i;
const MOVED_TO_QUARANTINE_PATTERN = /moved to quarantine/i;
const RE_DOWNLOAD_PATTERN = /re-download/i;
const VIEW_QUARANTINE_PATTERN = /view quarantine/i;
const CLOSE_PATTERN = /close/i;

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  modelId: "phi-3-mini",
  expectedHash:
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  actualHash:
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  onRedownload: vi.fn(),
  onViewQuarantine: vi.fn(),
};

describe("CorruptionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("content display", () => {
    it("shows title and description", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(
        screen.getByText("Download Verification Failed")
      ).toBeInTheDocument();
      expect(screen.getByText(APPEARS_CORRUPTED_PATTERN)).toBeInTheDocument();
    });

    it("displays model ID", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(screen.getByText("phi-3-mini")).toBeInTheDocument();
    });

    it("shows truncated hashes", () => {
      render(<CorruptionDialog {...defaultProps} />);

      // Expected hash: first 8 + last 8 chars
      expect(screen.getByText("9f86d081...b0f00a08")).toBeInTheDocument();
      // Actual hash: first 8 + last 8 chars
      expect(screen.getByText("a1b2c3d4...e9f0a1b2")).toBeInTheDocument();
    });

    it("explains possible causes", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(
        screen.getByText(NETWORK_INTERRUPTION_PATTERN)
      ).toBeInTheDocument();
      expect(screen.getByText(DISK_STORAGE_ERRORS_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(FILE_TAMPERING_PATTERN)).toBeInTheDocument();
    });

    it("shows quarantine notice", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(screen.getByText(MOVED_TO_QUARANTINE_PATTERN)).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls onRedownload and onClose when re-download is clicked", async () => {
      const user = userEvent.setup();
      render(<CorruptionDialog {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: RE_DOWNLOAD_PATTERN })
      );

      expect(defaultProps.onRedownload).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it("calls onViewQuarantine and onClose when view quarantine is clicked", async () => {
      const user = userEvent.setup();
      render(<CorruptionDialog {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: VIEW_QUARANTINE_PATTERN })
      );

      expect(defaultProps.onViewQuarantine).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  describe("visibility", () => {
    it("does not render content when closed", () => {
      render(<CorruptionDialog {...defaultProps} open={false} />);

      expect(
        screen.queryByText("Download Verification Failed")
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has appropriate ARIA attributes", () => {
      render(<CorruptionDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "corruption-title");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "corruption-description"
      );
    });

    it("has a close button with accessible name", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: CLOSE_PATTERN })
      ).toBeInTheDocument();
    });
  });
});
