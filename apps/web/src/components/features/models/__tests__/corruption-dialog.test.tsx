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
import { describe, expect, it, vi } from "vitest";
import { CorruptionDialog } from "../corruption-dialog";

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
      expect(screen.getByText(/appears to be corrupted/i)).toBeInTheDocument();
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

      expect(screen.getByText(/network interruption/i)).toBeInTheDocument();
      expect(screen.getByText(/disk storage errors/i)).toBeInTheDocument();
      expect(screen.getByText(/file tampering/i)).toBeInTheDocument();
    });

    it("shows quarantine notice", () => {
      render(<CorruptionDialog {...defaultProps} />);

      expect(screen.getByText(/moved to quarantine/i)).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls onRedownload and onClose when re-download is clicked", async () => {
      const user = userEvent.setup();
      render(<CorruptionDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /re-download/i }));

      expect(defaultProps.onRedownload).toHaveBeenCalledOnce();
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it("calls onViewQuarantine and onClose when view quarantine is clicked", async () => {
      const user = userEvent.setup();
      render(<CorruptionDialog {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /view quarantine/i })
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
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
    });
  });
});
