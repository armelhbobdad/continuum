/**
 * ManualCodeEntry Component Tests (Story 5.3, AC3)
 *
 * Tests for the manual OAuth code entry component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManualCodeEntry } from "../manual-code-entry";

describe("ManualCodeEntry", () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component with title", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText("Enter Authorization Code")).toBeInTheDocument();
    });

    it("should render instructions", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      expect(
        screen.getByText(/Copy the authorization code from the browser/)
      ).toBeInTheDocument();
    });

    it("should render input field", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByLabelText("Authorization Code")).toBeInTheDocument();
    });

    it("should render submit and cancel buttons", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      expect(
        screen.getByRole("button", { name: "Submit Code" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("should render help section", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText("How to find the code")).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("should allow typing in input field", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "test_auth_code_12345");

      expect(input).toHaveValue("test_auth_code_12345");
    });

    it("should disable submit button when input is empty", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole("button", { name: "Submit Code" });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when input has text", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "valid_code_12345");

      const submitButton = screen.getByRole("button", { name: "Submit Code" });
      expect(submitButton).toBeEnabled();
    });
  });

  describe("Validation", () => {
    it("should show error for empty code on submit attempt", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      // Type and clear to trigger validation
      await user.type(input, "a");
      await user.clear(input);

      // Try to submit (even though button is disabled, testing validation)
      const form = input.closest("form");
      if (form) {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      }

      // The validation should prevent submission
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should show error for short code", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "short");

      const form = input.closest("form");
      if (form) {
        await user.click(screen.getByRole("button", { name: "Submit Code" }));
      }

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should clear error when user starts typing", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "short");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Start typing again
      await user.type(input, "_more_text");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Submission", () => {
    it("should call onSubmit with trimmed code", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "  valid_auth_code_123  ");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith("valid_auth_code_123");
      });
    });

    it("should show loading state during submission", async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "valid_auth_code_123");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });

    it("should show error if submission fails", async () => {
      mockOnSubmit.mockRejectedValue(new Error("Invalid code"));

      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "valid_auth_code_123");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeInTheDocument();
      });
    });
  });

  describe("Cancel Action", () => {
    it("should call onCancel when cancel button clicked", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible input with label", () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      expect(input).toHaveAttribute("id", "auth-code");
    });

    it("should mark input as invalid when there is an error", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "short");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("should link error message to input", async () => {
      render(
        <ManualCodeEntry onCancel={mockOnCancel} onSubmit={mockOnSubmit} />
      );

      const input = screen.getByLabelText("Authorization Code");
      await user.type(input, "short");
      await user.click(screen.getByRole("button", { name: "Submit Code" }));

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-describedby", "code-error");
      });
    });
  });
});
