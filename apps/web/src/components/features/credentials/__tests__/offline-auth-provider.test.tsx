import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseOfflineAuthResult } from "@/hooks/use-offline-auth";
import { useConnectivityStore } from "@/stores/connectivity";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import { OfflineAuthProvider } from "../offline-auth-provider";

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
  refreshCredentials: vi.fn().mockResolvedValue({ success: true }),
  getDegradedMode: vi.fn(),
  ...overrides,
});

describe("OfflineAuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseOfflineAuth.mockReturnValue(createMockResult());
    // Start offline
    useConnectivityStore.setState({ isOnline: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders children", () => {
      useConnectivityStore.setState({ isOnline: true });

      render(
        <OfflineAuthProvider>
          <div data-testid="child">Child content</div>
        </OfflineAuthProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("renders without wrapper element", () => {
      useConnectivityStore.setState({ isOnline: true });

      const { container } = render(
        <OfflineAuthProvider>
          <div data-testid="child">Content</div>
        </OfflineAuthProvider>
      );

      // The child should be the only element
      expect(container.firstChild).toHaveAttribute("data-testid", "child");
    });
  });

  describe("silent refresh on reconnect (AC5)", () => {
    it("triggers refresh when coming online", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      const mockValidate = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
          validateOffline: mockValidate,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
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

    it("validates after successful refresh", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      const mockValidate = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
          validateOffline: mockValidate,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
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

      expect(mockValidate).toHaveBeenCalled();
    });

    it("does not validate after failed refresh", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: false });
      const mockValidate = vi.fn();
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
          validateOffline: mockValidate,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
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

      // Refresh was called but validate was not (refresh failed)
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("does not refresh if needsRefresh is false and in FullAccess mode", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: false,
          degradedMode: "FullAccess",
          refreshCredentials: mockRefresh,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
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

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("refreshes when in ReadOnly mode", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: false,
          degradedMode: "ReadOnly",
          refreshCredentials: mockRefresh,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
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

    it("waits for delay before refreshing", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={1000}>
          <div>Content</div>
        </OfflineAuthProvider>
      );

      // Transition to online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Not enough time
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(mockRefresh).not.toHaveBeenCalled();

      // Now enough time
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it("does not trigger when going offline", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      // Start online
      useConnectivityStore.setState({ isOnline: true });

      render(
        <OfflineAuthProvider refreshDelayMs={100}>
          <div>Content</div>
        </OfflineAuthProvider>
      );

      // Transition to offline
      act(() => {
        useConnectivityStore.setState({ isOnline: false });
      });

      // Fast forward
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe("disableSilentRefresh", () => {
    it("does not refresh when disableSilentRefresh is true", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      render(
        <OfflineAuthProvider disableSilentRefresh refreshDelayMs={100}>
          <div>Content</div>
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

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("clears timeout on unmount", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      const { unmount } = render(
        <OfflineAuthProvider refreshDelayMs={1000}>
          <div>Content</div>
        </OfflineAuthProvider>
      );

      // Transition to online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Unmount before timeout fires
      unmount();

      // Fast forward past delay
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      // Refresh should not be called because component was unmounted
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("clears previous timeout when transitioning again", async () => {
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      mockUseOfflineAuth.mockReturnValue(
        createMockResult({
          needsRefresh: true,
          refreshCredentials: mockRefresh,
        })
      );

      render(
        <OfflineAuthProvider refreshDelayMs={1000}>
          <div>Content</div>
        </OfflineAuthProvider>
      );

      // First transition to online
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Wait a bit
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Go offline again
      act(() => {
        useConnectivityStore.setState({ isOnline: false });
      });

      // Come back online (should reset timer)
      act(() => {
        useConnectivityStore.setState({ isOnline: true });
      });

      // Wait original timeout (from first transition)
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Should not have refreshed yet (timer was reset)
      expect(mockRefresh).not.toHaveBeenCalled();

      // Wait remaining time for new timeout
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
