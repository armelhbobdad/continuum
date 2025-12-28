/**
 * StorageWarning Component Tests
 * Story 2.3: Model Download Manager - Task 8
 *
 * Tests for storage space validation warning display.
 * AC5: Storage space validation with clear messaging
 */

import type { StorageCheckResult } from "@continuum/inference";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StorageWarning, StorageWarningInline } from "../storage-warning";

// Helper to create storage result
function createStorageResult(
  overrides: Partial<StorageCheckResult> = {}
): StorageCheckResult {
  return {
    hasSpace: false,
    availableMb: 2000,
    requiredMb: 4000,
    shortfallMb: 2000,
    ...overrides,
  };
}

describe("StorageWarning", () => {
  describe("Rendering", () => {
    it("should not render when hasSpace is true", () => {
      const result = createStorageResult({ hasSpace: true });

      const { container } = render(<StorageWarning result={result} />);

      expect(
        container.querySelector('[data-slot="storage-warning"]')
      ).not.toBeInTheDocument();
    });

    it("should render warning when hasSpace is false", () => {
      const result = createStorageResult({ hasSpace: false });

      render(<StorageWarning result={result} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Insufficient Storage Space")
      ).toBeInTheDocument();
    });

    it("should have data-slot='storage-warning'", () => {
      const result = createStorageResult();

      const { container } = render(<StorageWarning result={result} />);

      expect(
        container.querySelector('[data-slot="storage-warning"]')
      ).toBeInTheDocument();
    });

    it("should have aria-labelledby for accessibility", () => {
      const result = createStorageResult();

      render(<StorageWarning result={result} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-labelledby", "storage-warning-title");
    });
  });

  describe("Space Display (AC5)", () => {
    it("should display required space in MB", () => {
      const result = createStorageResult({ requiredMb: 500 });

      render(<StorageWarning result={result} />);

      expect(screen.getByText("500 MB")).toBeInTheDocument();
    });

    it("should display required space in GB for large values", () => {
      const result = createStorageResult({ requiredMb: 4096 }); // 4 GB

      render(<StorageWarning result={result} />);

      expect(screen.getByText("4.0 GB")).toBeInTheDocument();
    });

    it("should display available space", () => {
      const result = createStorageResult({ availableMb: 500 });

      render(<StorageWarning result={result} />);

      // 500 MB stays as MB
      expect(screen.getByText("Available space:")).toBeInTheDocument();
      expect(screen.getByText("500 MB")).toBeInTheDocument();
    });

    it("should display shortfall amount", () => {
      const result = createStorageResult({ shortfallMb: 800 });

      render(<StorageWarning result={result} />);

      // 800 MB stays as MB
      expect(screen.getByText("Shortfall:")).toBeInTheDocument();
      expect(screen.getByText("800 MB")).toBeInTheDocument();
    });

    it("should show model name in message when provided", () => {
      const result = createStorageResult();

      render(<StorageWarning modelName="Phi-3 Mini" result={result} />);

      expect(
        screen.getByText(/Not enough disk space to download Phi-3 Mini/)
      ).toBeInTheDocument();
    });

    it("should show generic message when model name not provided", () => {
      const result = createStorageResult();

      render(<StorageWarning result={result} />);

      expect(
        screen.getByText("Not enough disk space for this download.")
      ).toBeInTheDocument();
    });
  });

  describe("Suggestions", () => {
    it("should display suggestions section", () => {
      const result = createStorageResult();

      render(<StorageWarning result={result} />);

      expect(screen.getByText("Suggestions:")).toBeInTheDocument();
    });

    it("should list helpful suggestions", () => {
      const result = createStorageResult();

      render(<StorageWarning result={result} />);

      expect(
        screen.getByText("Clear disk space by removing unused files")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Choose a smaller model variant")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Delete unused downloaded models")
      ).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("should show cancel button when onCancel provided", () => {
      const result = createStorageResult();
      const onCancel = vi.fn();

      render(<StorageWarning onCancel={onCancel} result={result} />);

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("should call onCancel when cancel clicked", () => {
      const result = createStorageResult();
      const onCancel = vi.fn();

      render(<StorageWarning onCancel={onCancel} result={result} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onCancel).toHaveBeenCalled();
    });

    it("should show proceed button when onProceedAnyway provided", () => {
      const result = createStorageResult();
      const onProceedAnyway = vi.fn();

      render(
        <StorageWarning onProceedAnyway={onProceedAnyway} result={result} />
      );

      expect(
        screen.getByRole("button", { name: "Try Anyway" })
      ).toBeInTheDocument();
    });

    it("should call onProceedAnyway when clicked", () => {
      const result = createStorageResult();
      const onProceedAnyway = vi.fn();

      render(
        <StorageWarning onProceedAnyway={onProceedAnyway} result={result} />
      );

      fireEvent.click(screen.getByRole("button", { name: "Try Anyway" }));

      expect(onProceedAnyway).toHaveBeenCalled();
    });

    it("should not show action buttons when no callbacks provided", () => {
      const result = createStorageResult();

      render(<StorageWarning result={result} />);

      expect(
        screen.queryByRole("button", { name: "Cancel" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Try Anyway" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply custom className", () => {
      const result = createStorageResult();

      const { container } = render(
        <StorageWarning className="custom-class" result={result} />
      );

      expect(
        container.querySelector('[data-slot="storage-warning"]')
      ).toHaveClass("custom-class");
    });
  });
});

describe("StorageWarningInline", () => {
  describe("Rendering", () => {
    it("should not render when hasSpace is true", () => {
      const result = createStorageResult({ hasSpace: true });

      const { container } = render(<StorageWarningInline result={result} />);

      expect(container.firstChild).toBeNull();
    });

    it("should render inline warning when hasSpace is false", () => {
      const result = createStorageResult({
        hasSpace: false,
        shortfallMb: 500,
      });

      render(<StorageWarningInline result={result} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      // Check alert contains the shortfall value
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("500 MB");
      expect(alert.textContent).toContain("more space");
    });

    it("should show shortfall in GB for large values", () => {
      const result = createStorageResult({
        hasSpace: false,
        shortfallMb: 2048,
      });

      render(<StorageWarningInline result={result} />);

      expect(screen.getByText(/Need 2.0 GB more space/)).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply custom className", () => {
      const result = createStorageResult();

      render(
        <StorageWarningInline className="inline-custom" result={result} />
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("inline-custom");
    });
  });
});
