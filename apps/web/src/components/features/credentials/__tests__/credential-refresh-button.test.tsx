import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseOfflineAuthResult } from "@/hooks/use-offline-auth";
import { useConnectivityStore } from "@/stores/connectivity";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import { CredentialRefreshButton } from "../credential-refresh-button";

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
  degradedMode: "ReadOnly",
  daysRemaining: 5,
  needsRefresh: true,
  canWrite: false,
  needsReauth: false,
  isRefreshing: false,
  lastRefreshResult: null,
  error: null,
  validateOffline: vi.fn(),
  refreshCredentials: vi.fn().mockResolvedValue({ success: true, error: null }),
  getDegradedMode: vi.fn(),
  ...overrides,
});

describe("CredentialRefreshButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineAuth.mockReturnValue(createMockResult());
    // Set online by default
    useConnectivityStore.setState({ isOnline: true });
  });

  describe("visibility", () => {
    it("renders when needsRefresh is true", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ needsRefresh: true, degradedMode: "FullAccess" })
      );

      render(<CredentialRefreshButton />);
      expect(
        screen.getByTestId("credential-refresh-button")
      ).toBeInTheDocument();
    });

    it("renders in ReadOnly mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "ReadOnly", needsRefresh: false })
      );

      render(<CredentialRefreshButton />);
      expect(
        screen.getByTestId("credential-refresh-button")
      ).toBeInTheDocument();
    });

    it("renders in RequiresReauth mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "RequiresReauth",
          needsRefresh: false,
        })
      );

      render(<CredentialRefreshButton />);
      expect(
        screen.getByTestId("credential-refresh-button")
      ).toBeInTheDocument();
    });

    it("does not render in FullAccess mode without needsRefresh", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ degradedMode: "FullAccess", needsRefresh: false })
      );

      const { container } = render(<CredentialRefreshButton />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("refresh action", () => {
    it("calls refreshCredentials on click", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ refreshCredentials: mockRefresh })
      );

      render(<CredentialRefreshButton />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      expect(mockRefresh).toHaveBeenCalled();
    });

    it("shows success feedback after successful refresh", async () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          refreshCredentials: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      render(<CredentialRefreshButton />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      await waitFor(() => {
        expect(screen.getByTestId("refresh-feedback")).toHaveTextContent(
          "Credentials refreshed"
        );
      });
    });

    it("shows error feedback after failed refresh", async () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          refreshCredentials: vi
            .fn()
            .mockResolvedValue({ success: false, error: "Network error" }),
        })
      );

      render(<CredentialRefreshButton />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      await waitFor(() => {
        expect(screen.getByTestId("refresh-feedback")).toHaveTextContent(
          "Network error"
        );
      });
    });

    it("calls onRefreshComplete callback with success", async () => {
      const onComplete = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          refreshCredentials: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      render(<CredentialRefreshButton onRefreshComplete={onComplete} />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(true);
      });
    });

    it("calls onRefreshComplete callback with error", async () => {
      const onComplete = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          refreshCredentials: vi
            .fn()
            .mockResolvedValue({ success: false, error: "Auth failed" }),
        })
      );

      render(<CredentialRefreshButton onRefreshComplete={onComplete} />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(false, "Auth failed");
      });
    });
  });

  describe("disabled state", () => {
    it("is disabled when offline", () => {
      useConnectivityStore.setState({ isOnline: false });

      render(<CredentialRefreshButton />);
      expect(screen.getByTestId("credential-refresh-button")).toBeDisabled();
    });

    it("shows offline notice when offline", () => {
      useConnectivityStore.setState({ isOnline: false });

      render(<CredentialRefreshButton />);
      expect(screen.getByTestId("offline-notice")).toHaveTextContent(
        "Connect to internet to refresh"
      );
    });

    it("is disabled while refreshing", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ isRefreshing: true })
      );

      render(<CredentialRefreshButton />);
      expect(screen.getByTestId("credential-refresh-button")).toBeDisabled();
    });

    it("is enabled when online and not refreshing", () => {
      render(<CredentialRefreshButton />);
      expect(
        screen.getByTestId("credential-refresh-button")
      ).not.toBeDisabled();
    });
  });

  describe("loading state", () => {
    it("shows refreshing label when isRefreshing", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ isRefreshing: true })
      );

      render(<CredentialRefreshButton />);
      expect(screen.getByText("Refreshing...")).toBeInTheDocument();
    });

    it("has aria-busy when refreshing", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ isRefreshing: true })
      );

      render(<CredentialRefreshButton />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveAttribute(
        "aria-busy",
        "true"
      );
    });
  });

  describe("variants", () => {
    it("applies primary variant classes", () => {
      render(<CredentialRefreshButton variant="primary" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "bg-blue-600"
      );
    });

    it("applies secondary variant classes", () => {
      render(<CredentialRefreshButton variant="secondary" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "bg-gray-200"
      );
    });

    it("applies ghost variant classes", () => {
      render(<CredentialRefreshButton variant="ghost" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "bg-transparent"
      );
    });
  });

  describe("sizes", () => {
    it("applies small size classes", () => {
      render(<CredentialRefreshButton size="sm" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "text-xs"
      );
    });

    it("applies medium size classes", () => {
      render(<CredentialRefreshButton size="md" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "text-sm"
      );
    });

    it("applies large size classes", () => {
      render(<CredentialRefreshButton size="lg" />);
      expect(screen.getByTestId("credential-refresh-button")).toHaveClass(
        "text-base"
      );
    });
  });

  describe("label visibility", () => {
    it("shows label by default", () => {
      render(<CredentialRefreshButton />);
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    it("hides label when showLabel is false", () => {
      render(<CredentialRefreshButton showLabel={false} />);
      expect(screen.queryByText("Refresh")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible label", () => {
      render(<CredentialRefreshButton />);
      expect(screen.getByLabelText("Refresh credentials")).toBeInTheDocument();
    });

    it("has accessible label when refreshing", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ isRefreshing: true })
      );

      render(<CredentialRefreshButton />);
      expect(
        screen.getByLabelText("Refreshing credentials...")
      ).toBeInTheDocument();
    });

    it("feedback has status role", async () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          refreshCredentials: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      render(<CredentialRefreshButton />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      await waitFor(() => {
        // <output> element has implicit role="status" per HTML semantics
        expect(screen.getByRole("status")).toBeInTheDocument();
      });
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      render(<CredentialRefreshButton className="custom-class" />);
      // The className is on the wrapper div
      const button = screen.getByTestId("credential-refresh-button");
      expect(button.parentElement).toHaveClass("custom-class");
    });
  });
});
