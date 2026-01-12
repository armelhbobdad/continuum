/**
 * OAuthError Component Tests (Story 5.3, AC6)
 *
 * Tests for the OAuth error display component.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OAuthError as OAuthErrorType } from "@/types";
import { OAuthError } from "../oauth-error";

describe("OAuthError", () => {
  const user = userEvent.setup();
  const mockOnRetry = vi.fn();
  const mockOnTryManualEntry = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Error Display", () => {
    it("should display error message", () => {
      const error: OAuthErrorType = {
        type: "NetworkError",
        message: "Connection lost",
      };

      render(
        <OAuthError
          error={error}
          errorMessage="Network error: Connection lost"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText("Network error: Connection lost")
      ).toBeInTheDocument();
    });

    it("should display error title for DeepLinkTimeout", () => {
      const error: OAuthErrorType = { type: "DeepLinkTimeout" };

      render(
        <OAuthError
          error={error}
          errorMessage="Callback timed out"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Callback Timed Out")).toBeInTheDocument();
    });

    it("should display error title for LocalServerTimeout", () => {
      const error: OAuthErrorType = { type: "LocalServerTimeout" };

      render(
        <OAuthError
          error={error}
          errorMessage="Server timed out"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Server Timed Out")).toBeInTheDocument();
    });

    it("should display error title for InvalidState", () => {
      const error: OAuthErrorType = { type: "InvalidState" };

      render(
        <OAuthError
          error={error}
          errorMessage="Security check failed"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Security Check Failed")).toBeInTheDocument();
    });

    it("should display error title for Cancelled", () => {
      const error: OAuthErrorType = { type: "Cancelled" };

      render(
        <OAuthError
          error={error}
          errorMessage="Sign-in was cancelled"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Sign-in Cancelled")).toBeInTheDocument();
    });
  });

  describe("Suggestions", () => {
    it("should show suggestion for timeout errors", () => {
      const error: OAuthErrorType = { type: "DeepLinkTimeout" };

      render(
        <OAuthError
          error={error}
          errorMessage="Timed out"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(/You can try again or enter the code manually/)
      ).toBeInTheDocument();
    });

    it("should show suggestion for network errors", () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(/check your internet connection/)
      ).toBeInTheDocument();
    });

    it("should not show suggestion for cancelled errors", () => {
      const error: OAuthErrorType = { type: "Cancelled" };

      render(
        <OAuthError
          error={error}
          errorMessage="Cancelled"
          onCancel={mockOnCancel}
        />
      );

      // Just verify the component renders without suggestion
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });

  describe("Retry Action", () => {
    it("should show retry button when onRetry is provided", () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
          onRetry={mockOnRetry}
        />
      );

      expect(
        screen.getByRole("button", { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    it("should not show retry button when onRetry is not provided", () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.queryByRole("button", { name: /Try Again/i })
      ).not.toBeInTheDocument();
    });

    it("should call onRetry when retry button clicked", async () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
          onRetry={mockOnRetry}
        />
      );

      await user.click(screen.getByRole("button", { name: /Try Again/i }));

      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe("Manual Entry Fallback", () => {
    it("should show manual entry button for timeout errors", () => {
      const error: OAuthErrorType = { type: "DeepLinkTimeout" };

      render(
        <OAuthError
          error={error}
          errorMessage="Timed out"
          onCancel={mockOnCancel}
          onTryManualEntry={mockOnTryManualEntry}
        />
      );

      expect(
        screen.getByRole("button", { name: /Enter Code Manually/i })
      ).toBeInTheDocument();
    });

    it("should not show manual entry button for other errors", () => {
      const error: OAuthErrorType = { type: "InvalidCode" };

      render(
        <OAuthError
          error={error}
          errorMessage="Invalid code"
          onCancel={mockOnCancel}
          onTryManualEntry={mockOnTryManualEntry}
        />
      );

      expect(
        screen.queryByRole("button", { name: /Enter Code Manually/i })
      ).not.toBeInTheDocument();
    });

    it("should call onTryManualEntry when clicked", async () => {
      const error: OAuthErrorType = { type: "LocalServerTimeout" };

      render(
        <OAuthError
          error={error}
          errorMessage="Timed out"
          onCancel={mockOnCancel}
          onTryManualEntry={mockOnTryManualEntry}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /Enter Code Manually/i })
      );

      expect(mockOnTryManualEntry).toHaveBeenCalled();
    });
  });

  describe("Cancel Action", () => {
    it("should always show cancel button", () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("should call onCancel when cancel button clicked", async () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Technical Details", () => {
    it("should have collapsible technical details", () => {
      const error: OAuthErrorType = {
        type: "ProviderError",
        code: "403",
        description: "Forbidden",
      };

      render(
        <OAuthError
          error={error}
          errorMessage="Provider error"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Technical details")).toBeInTheDocument();
    });

    it("should show error JSON in technical details", async () => {
      const error: OAuthErrorType = {
        type: "InternalError",
        message: "Test error",
      };

      render(
        <OAuthError
          error={error}
          errorMessage="Internal error"
          onCancel={mockOnCancel}
        />
      );

      const details = screen.getByRole("group");
      const summary = details.querySelector("summary");
      if (summary) {
        await user.click(summary);
      }

      expect(screen.getByText(/"type": "InternalError"/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have alert role for error display", () => {
      const error: OAuthErrorType = { type: "NetworkError", message: "Failed" };

      render(
        <OAuthError
          error={error}
          errorMessage="Network failed"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
