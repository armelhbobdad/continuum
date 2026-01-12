import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseOfflineAuthResult } from "@/hooks/use-offline-auth";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import { DegradedModeIndicator } from "../degraded-mode-indicator";

// Mock useOfflineAuth hook
vi.mock("@/hooks/use-offline-auth", () => ({
  useOfflineAuth: vi.fn(),
}));

// Get the mocked hook
const mockUseOfflineAuth = vi.mocked(
  await import("@/hooks/use-offline-auth").then((m) => m.useOfflineAuth)
);

// Default mock result
const createMockResult = (
  overrides: Partial<UseOfflineAuthResult> = {}
): UseOfflineAuthResult => ({
  isAuthenticated: true,
  offlineValidation: DEFAULT_OFFLINE_VALIDATION,
  degradedMode: "FullAccess",
  daysRemaining: 30,
  needsRefresh: false,
  canWrite: true,
  needsReauth: false,
  isRefreshing: false,
  lastRefreshResult: null,
  error: null,
  validateOffline: vi.fn(),
  refreshCredentials: vi.fn(),
  getDegradedMode: vi.fn(),
  ...overrides,
});

describe("DegradedModeIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineAuth.mockReturnValue(createMockResult());
  });

  describe("visibility", () => {
    it("renders nothing in FullAccess mode by default", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "FullAccess" })
      );

      const { container } = render(<DegradedModeIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it("renders in FullAccess mode when alwaysShow is true", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "FullAccess" })
      );

      render(<DegradedModeIndicator alwaysShow />);
      expect(screen.getByTestId("degraded-mode-indicator")).toBeInTheDocument();
      expect(screen.getByText("Full Access")).toBeInTheDocument();
    });

    it("renders in ReadOnly mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByTestId("degraded-mode-indicator")).toBeInTheDocument();
      expect(screen.getByText("Read Only")).toBeInTheDocument();
    });

    it("renders in RequiresReauth mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "RequiresReauth" })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByTestId("degraded-mode-indicator")).toBeInTheDocument();
      expect(screen.getByText("Sign In Required")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error state when error exists", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          error: "Connection failed",
        })
      );

      render(<DegradedModeIndicator />);
      expect(
        screen.getByText("Failed to check offline status")
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("days remaining", () => {
    it("shows days remaining badge when > 0", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 15,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByText("15 days remaining")).toBeInTheDocument();
    });

    it("shows warning style for days <= 7", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 5,
        })
      );

      render(<DegradedModeIndicator />);
      const badge = screen.getByText("5 days remaining");
      expect(badge).toHaveClass("bg-amber-100");
    });

    it("does not show days badge when 0", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "RequiresReauth",
          daysRemaining: 0,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.queryByText(/days remaining/)).not.toBeInTheDocument();
    });
  });

  describe("refresh needed", () => {
    it("shows refresh needed badge when true", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByText("Refresh needed")).toBeInTheDocument();
    });

    it("does not show refresh badge when false", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: false,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.queryByText("Refresh needed")).not.toBeInTheDocument();
    });
  });

  describe("descriptions", () => {
    it("shows description in full mode by default", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator />);
      expect(
        screen.getByText(/Offline credentials are expiring/)
      ).toBeInTheDocument();
    });

    it("hides description when showDetails is false", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator showDetails={false} />);
      expect(
        screen.queryByText(/Offline credentials are expiring/)
      ).not.toBeInTheDocument();
    });
  });

  describe("warning messages", () => {
    it("shows reauth warning in RequiresReauth mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "RequiresReauth" })
      );

      render(<DegradedModeIndicator />);
      expect(
        screen.getByText(/Your offline session has expired/)
      ).toBeInTheDocument();
    });

    it("shows read-only warning in ReadOnly mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator />);
      // The warning box contains more specific text
      expect(
        screen.getByText(
          /Connect to refresh your credentials before they expire/
        )
      ).toBeInTheDocument();
    });

    it("does not show warnings in FullAccess mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "FullAccess" })
      );

      render(<DegradedModeIndicator alwaysShow />);
      expect(
        screen.queryByText(/Write operations are disabled/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Your offline session has expired/)
      ).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders compact view", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator compact />);
      const indicator = screen.getByTestId("degraded-mode-indicator");
      expect(indicator).toHaveClass("inline-flex");
      expect(indicator).toHaveClass("rounded-full");
    });

    it("shows days in compact format when <= 7", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 5,
        })
      );

      render(<DegradedModeIndicator compact />);
      expect(screen.getByText("5d")).toBeInTheDocument();
    });

    it("hides days in compact format when > 7", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 15,
        })
      );

      render(<DegradedModeIndicator compact />);
      expect(screen.queryByText("15d")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible label in full mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator />);
      expect(
        screen.getByLabelText("Offline authentication mode: Read Only")
      ).toBeInTheDocument();
    });

    it("has accessible label in compact mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator compact />);
      expect(
        screen.getByLabelText("Offline mode: Read Only")
      ).toBeInTheDocument();
    });

    it("uses output element for live announcements", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator />);
      const indicator = screen.getByTestId("degraded-mode-indicator");
      expect(indicator.tagName.toLowerCase()).toBe("output");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly" })
      );

      render(<DegradedModeIndicator className="custom-class" />);
      expect(screen.getByTestId("degraded-mode-indicator")).toHaveClass(
        "custom-class"
      );
    });
  });
});
