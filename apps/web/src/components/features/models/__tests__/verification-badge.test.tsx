/**
 * VerificationBadge Tests
 * Story 2.5: Model Integrity Verification
 *
 * Tests for AC2: Verified Badge Display
 * - Verified/Unverified/Failed/Verifying states
 * - Timestamp display on hover
 * - Accessibility with role="status"
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerificationBadge, VerifyNowButton } from "../verification-badge";

describe("VerificationBadge", () => {
  describe("status display", () => {
    it("shows 'Verified' for verified status", () => {
      render(<VerificationBadge status="verified" />);

      expect(screen.getByText("Verified")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveClass("text-green-700");
    });

    it("shows 'Unverified' for unverified status", () => {
      render(<VerificationBadge status="unverified" />);

      expect(screen.getByText("Unverified")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveClass("text-gray-600");
    });

    it("shows 'Failed' for failed status", () => {
      render(<VerificationBadge status="failed" />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveClass("text-red-700");
    });

    it("shows 'Verifying...' for verifying status", () => {
      render(<VerificationBadge status="verifying" />);

      expect(screen.getByText("Verifying...")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveClass("text-blue-700");
    });
  });

  describe("accessibility", () => {
    it("has role='status' for screen readers", () => {
      render(<VerificationBadge status="verified" />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has appropriate aria-label for each status", () => {
      const { rerender } = render(<VerificationBadge status="verified" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Model integrity verified"
      );

      rerender(<VerificationBadge status="failed" />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Model verification failed - integrity may be compromised"
      );
    });

    it("includes data-slot for styling hooks", () => {
      render(<VerificationBadge status="verified" />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "data-slot",
        "verification-badge"
      );
    });
  });

  describe("timestamp tooltip", () => {
    it("shows formatted timestamp in title", () => {
      const timestamp = new Date("2025-01-15T10:30:00").getTime();
      render(<VerificationBadge status="verified" timestamp={timestamp} />);

      const badge = screen.getByRole("status");
      expect(badge.title).toContain("Verified on");
      expect(badge.title).toContain("Jan");
      expect(badge.title).toContain("15");
    });

    it("shows status only when no timestamp", () => {
      render(<VerificationBadge status="unverified" />);

      const badge = screen.getByRole("status");
      expect(badge.title).toBe("Unverified");
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      render(<VerificationBadge className="custom-class" status="verified" />);

      expect(screen.getByRole("status")).toHaveClass("custom-class");
    });
  });
});

describe("VerifyNowButton", () => {
  it("renders with 'Verify Now' text", () => {
    render(<VerifyNowButton onVerify={() => {}} />);

    expect(
      screen.getByRole("button", { name: /verify now/i })
    ).toBeInTheDocument();
  });

  it("shows 'Verifying...' when isVerifying is true", () => {
    render(<VerifyNowButton isVerifying onVerify={() => {}} />);

    expect(screen.getByRole("button")).toHaveTextContent("Verifying...");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onVerify when clicked", () => {
    const mockVerify = vi.fn();
    render(<VerifyNowButton onVerify={mockVerify} />);

    screen.getByRole("button").click();
    expect(mockVerify).toHaveBeenCalledOnce();
  });

  it("is disabled while verifying", () => {
    render(<VerifyNowButton isVerifying onVerify={() => {}} />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
});
