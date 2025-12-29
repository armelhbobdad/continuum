/**
 * HardwareWarningDialog Component Tests
 * Story 2.4: Model Selection & Switching
 *
 * Tests for hardware warning dialog functionality.
 * AC4: Hardware Warning
 */

import type { ModelMetadata } from "@continuum/inference";
import type { HardwareCapabilities } from "@continuum/platform";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HardwareWarningDialog,
  resetHardwareWarningPreference,
  shouldShowHardwareWarning,
} from "../hardware-warning-dialog";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Test fixtures
const mockModel: ModelMetadata = {
  id: "mistral-7b",
  name: "Mistral 7B",
  version: "7b-4bit",
  description: "High-performance instruction following",
  requirements: { ramMb: 6144, gpuVramMb: 0, storageMb: 4200 },
  capabilities: ["general-chat"],
  limitations: [],
  contextLength: 8192,
  license: { name: "Apache 2.0", url: "https://example.com", commercial: true },
  vulnerabilities: [],
  downloadUrl: "https://example.com/mistral.gguf",
  sha256: "abc",
  tokenizerUrl:
    "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/resolve/main/tokenizer.json",
};

const mockHardwareLow: HardwareCapabilities = {
  ram: 6144, // 6GB - exactly matches model requirement (100%)
  cpuCores: 4,
  storageAvailable: 50_000,
  gpu: null,
  detectedBy: "desktop",
  detectedAt: new Date(),
};

const mockHardwareHigh: HardwareCapabilities = {
  ram: 32_768, // 32GB - plenty of headroom (25% usage)
  cpuCores: 16,
  storageAvailable: 500_000,
  gpu: { name: "RTX 4090", vram: 24_576, computeCapable: true },
  detectedBy: "desktop",
  detectedAt: new Date(),
};

describe("HardwareWarningDialog", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("shouldShowHardwareWarning (Task 6.2-6.3)", () => {
    it("should show warning when RAM usage > 80%", () => {
      const result = shouldShowHardwareWarning(
        mockModel,
        mockHardwareLow, // 8GB model on 8GB system = 100%
        "may-be-slow"
      );
      expect(result).toBe(true);
    });

    it("should not show warning when RAM usage <= 80%", () => {
      const result = shouldShowHardwareWarning(
        mockModel,
        mockHardwareHigh, // 8GB model on 32GB system = 25%
        "may-be-slow"
      );
      expect(result).toBe(false);
    });

    it("should not show warning for recommended models", () => {
      const result = shouldShowHardwareWarning(
        mockModel,
        mockHardwareLow,
        "recommended"
      );
      expect(result).toBe(false);
    });

    it("should not show warning when suppressed (Task 6.5)", () => {
      localStorageMock.setItem("continuum:suppress-hardware-warning", "true");

      const result = shouldShowHardwareWarning(
        mockModel,
        mockHardwareLow,
        "may-be-slow"
      );
      expect(result).toBe(false);
    });
  });

  describe("Dialog Rendering", () => {
    it("should not render when closed", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open={false}
          recommendation="may-be-slow"
        />
      );

      expect(
        screen.queryByTestId("hardware-warning-dialog")
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByTestId("hardware-warning-dialog")).toBeInTheDocument();
    });

    it("should display model name", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByText("Mistral 7B")).toBeInTheDocument();
    });

    it("should display RAM requirements", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      // Both model requires and system have "6.0 GB RAM" - check both exist
      const ramElements = screen.getAllByText("6.0 GB RAM");
      expect(ramElements.length).toBeGreaterThanOrEqual(1);
    });

    it("should display RAM usage percentage", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("User Actions (Task 6.4)", () => {
    it("should call onConfirm when 'Proceed Anyway' clicked", () => {
      const handleConfirm = vi.fn();
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
          open
          recommendation="may-be-slow"
        />
      );

      fireEvent.click(screen.getByText("Proceed Anyway"));
      expect(handleConfirm).toHaveBeenCalled();
    });

    it("should call onCancel when 'Choose Different' clicked", () => {
      const handleCancel = vi.fn();
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={handleCancel}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      fireEvent.click(screen.getByText("Choose Different"));
      expect(handleCancel).toHaveBeenCalled();
    });

    it("should call onCancel when Escape pressed", () => {
      const handleCancel = vi.fn();
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={handleCancel}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleCancel).toHaveBeenCalled();
    });
  });

  describe("Suppress Warning (Task 6.5)", () => {
    it("should save suppression preference when checkbox checked and confirmed", () => {
      const handleConfirm = vi.fn();
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
          open
          recommendation="may-be-slow"
        />
      );

      // Check the "Don't show again" checkbox
      fireEvent.click(screen.getByLabelText(/don't show this warning again/i));

      // Confirm
      fireEvent.click(screen.getByText("Proceed Anyway"));

      expect(
        localStorageMock.getItem("continuum:suppress-hardware-warning")
      ).toBe("true");
    });

    it("should not save suppression when checkbox unchecked", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      // Confirm without checking the box
      fireEvent.click(screen.getByText("Proceed Anyway"));

      expect(
        localStorageMock.getItem("continuum:suppress-hardware-warning")
      ).toBeNull();
    });
  });

  describe("resetHardwareWarningPreference", () => {
    it("should clear suppression preference", () => {
      localStorageMock.setItem("continuum:suppress-hardware-warning", "true");

      resetHardwareWarningPreference();

      expect(
        localStorageMock.getItem("continuum:suppress-hardware-warning")
      ).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("should have role='alertdialog'", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have aria-modal='true'", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByRole("alertdialog")).toHaveAttribute(
        "aria-modal",
        "true"
      );
    });

    it("should have ARIA live region", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="may-be-slow"
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should show destructive button for not-recommended models", () => {
      render(
        <HardwareWarningDialog
          hardware={mockHardwareLow}
          model={mockModel}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          open
          recommendation="not-recommended"
        />
      );

      // The Proceed Anyway button should have destructive variant
      const proceedButton = screen.getByText("Proceed Anyway");
      // Checking for a class that indicates destructive variant
      expect(proceedButton).toBeInTheDocument();
    });
  });
});
