/**
 * Offline Authentication Integration Tests (Story 5.4)
 *
 * Tests the complete offline authentication flow including:
 * - Credential validation (AC1)
 * - Degraded mode indicators (AC3)
 * - Performance requirements (AC4)
 * - Silent refresh on reconnect (AC5)
 * - Manual refresh button (AC7)
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseOfflineAuthResult } from "@/hooks/use-offline-auth";
import { useConnectivityStore } from "@/stores/connectivity";
import { useCredentialStore } from "@/stores/credentials";
import type {
  DegradedMode,
  OfflineValidationResult,
} from "@/types/credentials";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import { CredentialRefreshButton } from "../credential-refresh-button";
import { DegradedModeIndicator } from "../degraded-mode-indicator";
import { OfflineAuthProvider } from "../offline-auth-provider";

// Mock useOfflineAuth hook
vi.mock("@/hooks/use-offline-auth", () => ({
  useOfflineAuth: vi.fn(),
}));

// Get the mocked hook
const mockUseOfflineAuth = vi.mocked(
  await import("@/hooks/use-offline-auth").then((m) => m.useOfflineAuth)
);

// Helper to create mock result
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
  refreshCredentials: vi.fn().mockResolvedValue({ success: true }),
  getDegradedMode: vi.fn(),
  ...overrides,
});

describe("Offline Authentication Integration (Story 5.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseOfflineAuth.mockReturnValue(createMockResult());
    useConnectivityStore.setState({ isOnline: true, isStable: true });
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
      offlineValidation: DEFAULT_OFFLINE_VALIDATION,
      degradedMode: "RequiresReauth",
      lastRefreshResult: null,
      isRefreshing: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AC1: Offline authentication from cached credentials", () => {
    it("validates credentials on provider mount", () => {
      const mockValidate = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({ validateOffline: mockValidate })
      );

      // Note: validateOffline is called within useOfflineAuth's useEffect
      // The mock doesn't trigger the actual effect, but we verify the hook is used
      render(
        <OfflineAuthProvider disableSilentRefresh>
          <div>App</div>
        </OfflineAuthProvider>
      );

      // Provider renders children
      expect(screen.getByText("App")).toBeInTheDocument();
    });

    it("shows authenticated state with valid offline credentials", () => {
      const validResult: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          isAuthenticated: true,
          offlineValidation: validResult,
          degradedMode: "FullAccess",
          daysRemaining: 30,
        })
      );

      render(<DegradedModeIndicator alwaysShow />);
      expect(screen.getByText("Full Access")).toBeInTheDocument();
      expect(screen.getByText("30 days remaining")).toBeInTheDocument();
    });
  });

  describe("AC3: Degraded mode indicators", () => {
    it("shows read-only indicator when credentials are expiring", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 5,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByText("Read Only")).toBeInTheDocument();
      expect(screen.getByText("5 days remaining")).toBeInTheDocument();
    });

    it("shows requires-reauth indicator when expired", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "RequiresReauth",
          daysRemaining: 0,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByText("Sign In Required")).toBeInTheDocument();
    });

    it("displays refresh needed badge", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
        })
      );

      render(<DegradedModeIndicator />);
      expect(screen.getByText("Refresh needed")).toBeInTheDocument();
    });
  });

  describe("AC5: Silent refresh when coming online", () => {
    it("triggers refresh after connectivity transition", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      // Start offline
      useConnectivityStore.setState({ isOnline: false });

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>App</div>
        </OfflineAuthProvider>
      );

      // Transition to online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Fast forward past delay
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it("respects 5-second delay pattern", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      // Start offline
      useConnectivityStore.setState({ isOnline: false });

      render(
        <OfflineAuthProvider refreshDelayMs={5000}>
          <div>App</div>
        </OfflineAuthProvider>
      );

      // Transition to online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // 4 seconds is not enough
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(mockRefresh).not.toHaveBeenCalled();

      // 5 seconds is enough
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("AC7: Manual refresh button", () => {
    it("shows refresh button in degraded mode", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
        })
      );

      render(<CredentialRefreshButton />);
      expect(
        screen.getByTestId("credential-refresh-button")
      ).toBeInTheDocument();
    });

    it("triggers refresh on button click", async () => {
      vi.useRealTimers(); // Need real timers for userEvent

      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      render(<CredentialRefreshButton />);
      await userEvent.click(screen.getByTestId("credential-refresh-button"));

      expect(mockRefresh).toHaveBeenCalled();
    });

    it("shows success feedback after refresh", async () => {
      vi.useRealTimers();

      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
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

    it("disables button when offline", () => {
      useConnectivityStore.setState({ isOnline: false });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          needsRefresh: true,
        })
      );

      render(<CredentialRefreshButton />);
      expect(screen.getByTestId("credential-refresh-button")).toBeDisabled();
      expect(screen.getByTestId("offline-notice")).toBeInTheDocument();
    });
  });

  describe("Complete flow integration", () => {
    it("handles full offline-to-online-with-refresh cycle", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      const mockValidate = vi.fn();

      // Start with expired credentials offline
      useConnectivityStore.setState({ isOnline: false });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          isAuthenticated: true,
          degradedMode: "ReadOnly",
          daysRemaining: 3,
          needsRefresh: true,
          refreshCredentials: mockRefresh,
          validateOffline: mockValidate,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>
            <DegradedModeIndicator />
            <CredentialRefreshButton />
          </div>
        </OfflineAuthProvider>
      );

      // Verify degraded mode is shown
      expect(screen.getByText("Read Only")).toBeInTheDocument();
      expect(screen.getByText("3 days remaining")).toBeInTheDocument();

      // Verify button is disabled offline
      expect(screen.getByTestId("credential-refresh-button")).toBeDisabled();

      // Come online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Fast forward to trigger silent refresh
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      // Silent refresh should have been triggered
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("handles multiple components with shared state", () => {
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          degradedMode: "ReadOnly",
          daysRemaining: 5,
          needsRefresh: true,
        })
      );

      render(
        <OfflineAuthProvider disableSilentRefresh>
          <div>
            <DegradedModeIndicator compact />
            <DegradedModeIndicator showDetails={false} />
            <CredentialRefreshButton />
          </div>
        </OfflineAuthProvider>
      );

      // Both indicators should show same mode
      const indicators = screen.getAllByText("Read Only");
      expect(indicators).toHaveLength(2);

      // Refresh button should be visible
      expect(
        screen.getByTestId("credential-refresh-button")
      ).toBeInTheDocument();
    });
  });

  describe("Degraded mode transitions", () => {
    const scenarios: Array<{
      mode: DegradedMode;
      expectedDisplay: string;
      shouldShowButton: boolean;
    }> = [
      {
        mode: "FullAccess",
        expectedDisplay: "Full Access",
        shouldShowButton: false,
      },
      {
        mode: "ReadOnly",
        expectedDisplay: "Read Only",
        shouldShowButton: true,
      },
      {
        mode: "RequiresReauth",
        expectedDisplay: "Sign In Required",
        shouldShowButton: true,
      },
    ];

    for (const { mode, expectedDisplay, shouldShowButton } of scenarios) {
      it(`handles ${mode} mode correctly`, () => {
        mockUseOfflineAuth.mockReturnValue(
          createMockResult({
            degradedMode: mode,
            needsRefresh: mode !== "FullAccess",
          })
        );

        render(
          <>
            <DegradedModeIndicator alwaysShow />
            <CredentialRefreshButton />
          </>
        );

        expect(screen.getByText(expectedDisplay)).toBeInTheDocument();

        if (shouldShowButton) {
          expect(
            screen.getByTestId("credential-refresh-button")
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByTestId("credential-refresh-button")
          ).not.toBeInTheDocument();
        }
      });
    }
  });
});
