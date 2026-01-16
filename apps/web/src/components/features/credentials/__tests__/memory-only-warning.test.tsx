/**
 * MemoryOnlyWarning Component Tests (Story 5.2, AC5)
 *
 * Tests for the memory-only warning dialog component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageInfo } from "@/types/credentials";

// Top-level regex patterns for lint compliance
const LOST_WHEN_CLOSE_REGEX = /lost when you close the app/;
const KEYCHAIN_NOT_AVAILABLE_REGEX = /OS keychain is not available/;
const STRONGHOLD_VAULT_REGEX = /Stronghold encrypted vault/;
const INSUFFICIENT_PERMISSIONS_REGEX = /Insufficient permissions/;
const STORAGE_STATUS_SESSION_REGEX = /Storage Status: Session Only/;

// Mock useStorageInfo hook
const mockUseStorageInfo = vi.fn();

vi.mock("@/hooks/use-storage-info", () => ({
  useStorageInfo: () => mockUseStorageInfo(),
}));

import { renderHook } from "@testing-library/react";
// Import after mocking
import {
  MemoryOnlyWarning,
  useMemoryOnlyWarningState,
} from "../memory-only-warning";

describe("MemoryOnlyWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const memoryOnlyInfo: StorageInfo = {
    tier: "MemoryOnly",
    display_name: "Session Only",
    security_level: "Limited",
    description: "In-memory storage, lost on app close",
    persists_on_restart: false,
  };

  const keychainInfo: StorageInfo = {
    tier: "Keychain",
    display_name: "macOS Keychain",
    security_level: "Highest",
    description: "OS-managed secure credential storage",
    persists_on_restart: true,
  };

  describe("Visibility", () => {
    it("should render when in memory-only mode", () => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });

      render(<MemoryOnlyWarning />);

      expect(screen.getByText("Credentials Not Persisted")).toBeInTheDocument();
    });

    it("should not render when not in memory-only mode", () => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: false,
        isLoading: false,
        storageInfo: keychainInfo,
      });

      render(<MemoryOnlyWarning />);

      expect(
        screen.queryByText("Credentials Not Persisted")
      ).not.toBeInTheDocument();
    });

    it("should not render while loading", () => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: true,
        storageInfo: memoryOnlyInfo,
      });

      render(<MemoryOnlyWarning />);

      expect(
        screen.queryByText("Credentials Not Persisted")
      ).not.toBeInTheDocument();
    });
  });

  describe("Banner Variant", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });
    });

    it("should render as banner by default", () => {
      render(<MemoryOnlyWarning />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should display warning message", () => {
      render(<MemoryOnlyWarning />);

      expect(screen.getByText(LOST_WHEN_CLOSE_REGEX)).toBeInTheDocument();
    });

    it("should display reasons list", () => {
      render(<MemoryOnlyWarning />);

      expect(
        screen.getByText(KEYCHAIN_NOT_AVAILABLE_REGEX)
      ).toBeInTheDocument();
      expect(screen.getByText(STRONGHOLD_VAULT_REGEX)).toBeInTheDocument();
      expect(
        screen.getByText(INSUFFICIENT_PERMISSIONS_REGEX)
      ).toBeInTheDocument();
    });

    it("should have dismiss button", () => {
      render(<MemoryOnlyWarning />);

      expect(screen.getByLabelText("Dismiss warning")).toBeInTheDocument();
    });

    it("should dismiss when button clicked", () => {
      render(<MemoryOnlyWarning />);

      const dismissButton = screen.getByLabelText("Dismiss warning");
      fireEvent.click(dismissButton);

      expect(
        screen.queryByText("Credentials Not Persisted")
      ).not.toBeInTheDocument();
    });

    it("should call onDismiss callback when dismissed", () => {
      const onDismiss = vi.fn();
      render(<MemoryOnlyWarning onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss warning");
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dialog Variant", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });
    });

    it("should render as dialog when variant is dialog", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have aria-modal attribute", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("should display storage status in dialog", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      expect(
        screen.getByText(STORAGE_STATUS_SESSION_REGEX)
      ).toBeInTheDocument();
    });

    it("should have I Understand button", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      expect(
        screen.getByRole("button", { name: "I Understand" })
      ).toBeInTheDocument();
    });

    it("should dismiss when I Understand clicked", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      const button = screen.getByRole("button", { name: "I Understand" });
      fireEvent.click(button);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Session Storage", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });
    });

    it("should save dismissal to session storage when showOncePerSession is true", () => {
      render(<MemoryOnlyWarning showOncePerSession />);

      const dismissButton = screen.getByLabelText("Dismiss warning");
      fireEvent.click(dismissButton);

      expect(sessionStorage.getItem("memory-only-warning-dismissed")).toBe(
        "true"
      );
    });

    it("should not show when already dismissed in session", () => {
      sessionStorage.setItem("memory-only-warning-dismissed", "true");

      render(<MemoryOnlyWarning showOncePerSession />);

      expect(
        screen.queryByText("Credentials Not Persisted")
      ).not.toBeInTheDocument();
    });

    it("should not save to session storage when showOncePerSession is false", () => {
      render(<MemoryOnlyWarning showOncePerSession={false} />);

      const dismissButton = screen.getByLabelText("Dismiss warning");
      fireEvent.click(dismissButton);

      expect(
        sessionStorage.getItem("memory-only-warning-dismissed")
      ).toBeNull();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });
    });

    it("should have alert role for banner", () => {
      render(<MemoryOnlyWarning variant="banner" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should have aria-live polite for banner", () => {
      render(<MemoryOnlyWarning variant="banner" />);

      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    });

    it("should have dialog role for dialog variant", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have aria-labelledby and aria-describedby for dialog", () => {
      render(<MemoryOnlyWarning variant="dialog" />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "memory-warning-title");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "memory-warning-description"
      );
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      mockUseStorageInfo.mockReturnValue({
        isMemoryOnly: true,
        isLoading: false,
        storageInfo: memoryOnlyInfo,
      });

      render(<MemoryOnlyWarning className="custom-class" />);

      expect(screen.getByRole("alert")).toHaveClass("custom-class");
    });
  });
});

describe("useMemoryOnlyWarningState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return shouldShow true when memory-only and not dismissed", () => {
    mockUseStorageInfo.mockReturnValue({
      isMemoryOnly: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useMemoryOnlyWarningState());

    expect(result.current.shouldShow).toBe(true);
    expect(result.current.isMemoryOnly).toBe(true);
    expect(result.current.isDismissed).toBe(false);
  });

  it("should return shouldShow false when not memory-only", () => {
    mockUseStorageInfo.mockReturnValue({
      isMemoryOnly: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useMemoryOnlyWarningState());

    expect(result.current.shouldShow).toBe(false);
  });

  it("should return shouldShow false when loading", () => {
    mockUseStorageInfo.mockReturnValue({
      isMemoryOnly: true,
      isLoading: true,
    });

    const { result } = renderHook(() => useMemoryOnlyWarningState());

    expect(result.current.shouldShow).toBe(false);
  });
});
