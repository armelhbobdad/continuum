/**
 * StorageTierIndicator Component Tests (Story 5.2, AC6)
 *
 * Tests for the storage tier indicator UI component.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageInfo } from "@/types/credentials";

// Top-level regex patterns for lint compliance
const CREDENTIALS_LOST_REGEX = /Credentials will be lost when the app closes/;

// Mock useStorageInfo hook
const mockUseStorageInfo = vi.fn();

vi.mock("@/hooks/use-storage-info", () => ({
  useStorageInfo: () => mockUseStorageInfo(),
}));

// Import after mocking
import { StorageTierIndicator } from "../storage-tier-indicator";

describe("StorageTierIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const keychainInfo: StorageInfo = {
    tier: "Keychain",
    display_name: "macOS Keychain",
    security_level: "Highest",
    description: "OS-managed secure credential storage",
    persists_on_restart: true,
  };

  const strongholdInfo: StorageInfo = {
    tier: "Stronghold",
    display_name: "Encrypted Vault",
    security_level: "Good",
    description: "Encrypted vault storage on disk",
    persists_on_restart: true,
  };

  const memoryOnlyInfo: StorageInfo = {
    tier: "MemoryOnly",
    display_name: "Session Only",
    security_level: "Limited",
    description: "In-memory storage, lost on app close",
    persists_on_restart: false,
  };

  describe("Loading State", () => {
    it("should show loading state", () => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: memoryOnlyInfo,
        isLoading: true,
        error: null,
        isMemoryOnly: false,
      });

      render(<StorageTierIndicator />);

      expect(
        screen.getByLabelText("Loading storage information")
      ).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error state", () => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: memoryOnlyInfo,
        isLoading: false,
        error: "Failed to load",
        isMemoryOnly: false,
      });

      render(<StorageTierIndicator />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to load storage info")
      ).toBeInTheDocument();
    });
  });

  describe("Keychain Tier Display", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: keychainInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: false,
      });
    });

    it("should display keychain tier name", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("macOS Keychain")).toBeInTheDocument();
    });

    it("should display Highest security level", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("Highest")).toBeInTheDocument();
    });

    it("should display Persists badge", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("Persists")).toBeInTheDocument();
    });

    it("should display description when showDescription is true", () => {
      render(<StorageTierIndicator showDescription />);

      expect(
        screen.getByText("OS-managed secure credential storage")
      ).toBeInTheDocument();
    });

    it("should not show memory-only warning", () => {
      render(<StorageTierIndicator />);

      expect(
        screen.queryByText(CREDENTIALS_LOST_REGEX)
      ).not.toBeInTheDocument();
    });
  });

  describe("Stronghold Tier Display", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: strongholdInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: false,
      });
    });

    it("should display stronghold tier name", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("Encrypted Vault")).toBeInTheDocument();
    });

    it("should display Good security level", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("Good")).toBeInTheDocument();
    });
  });

  describe("Memory-Only Tier Display", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: memoryOnlyInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: true,
      });
    });

    it("should display memory-only tier name", () => {
      render(<StorageTierIndicator />);

      // "Session Only" appears twice - in the tier name (h3) and as the badge
      expect(screen.getAllByText("Session Only")).toHaveLength(2);
    });

    it("should display Limited security level", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText("Limited")).toBeInTheDocument();
    });

    it("should display Session Only badge instead of Persists", () => {
      render(<StorageTierIndicator />);

      // "Session Only" appears twice - in the tier name and as the badge
      expect(screen.getAllByText("Session Only")).toHaveLength(2);
      expect(screen.queryByText("Persists")).not.toBeInTheDocument();
    });

    it("should show memory-only warning", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByText(CREDENTIALS_LOST_REGEX)).toBeInTheDocument();
    });
  });

  describe("Compact Mode", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: keychainInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: false,
      });
    });

    it("should render in compact mode", () => {
      render(<StorageTierIndicator compact />);

      expect(screen.getByText("macOS Keychain")).toBeInTheDocument();
    });

    it("should not show description in compact mode", () => {
      render(<StorageTierIndicator compact />);

      expect(
        screen.queryByText("OS-managed secure credential storage")
      ).not.toBeInTheDocument();
    });

    it("should have correct aria-label in compact mode", () => {
      render(<StorageTierIndicator compact />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Storage: macOS Keychain"
      );
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: keychainInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: false,
      });
    });

    it("should have status role", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should have aria-label describing the storage", () => {
      render(<StorageTierIndicator />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Credential storage: macOS Keychain"
      );
    });

    it("should hide decorative icons from screen readers", () => {
      render(<StorageTierIndicator />);

      const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      mockUseStorageInfo.mockReturnValue({
        storageInfo: keychainInfo,
        isLoading: false,
        error: null,
        isMemoryOnly: false,
      });

      render(<StorageTierIndicator className="custom-class" />);

      expect(screen.getByRole("status")).toHaveClass("custom-class");
    });
  });
});
