import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useConnectivityStore } from "@/stores/connectivity";

/**
 * Connectivity Integration Tests
 *
 * Story 4.1: All Acceptance Criteria
 * Tests the full connectivity detection flow across store, hook, and events.
 */

// Mock fetch for heartbeat
const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("Connectivity Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe("AC1: Automatic Offline Detection", () => {
    it("8.1 detects offline when network drops: drop → detect → display", async () => {
      const { result, unmount } = renderHook(() => useConnectivity());

      // Initial state: online
      expect(result.current.isOnline).toBe(true);

      // Simulate network drop
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
      });

      // During debounce, should be unstable
      expect(result.current.isStable).toBe(false);

      // Wait for debounce (2000ms per AC4)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // After debounce: offline and stable
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isStable).toBe(true);

      // Verify store state matches hook
      const storeState = useConnectivityStore.getState();
      expect(storeState.isOnline).toBe(false);
      expect(storeState.lastChecked).not.toBeNull();

      unmount();
    });
  });

  describe("AC3: Online Restoration", () => {
    it("8.2 shows toast on reconnection: restore → detect → toast → hide indicator", async () => {
      const { toast } = await import("sonner");
      const { result, unmount } = renderHook(() => useConnectivity());

      // Go offline first
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Verify offline
      expect(result.current.isOnline).toBe(false);

      // Clear any previous toast calls
      vi.mocked(toast.success).mockClear();

      // Come back online
      await act(async () => {
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Verify online restoration
      expect(result.current.isOnline).toBe(true);

      // Verify toast was shown (AC3)
      expect(toast.success).toHaveBeenCalledWith(
        "Back online",
        expect.objectContaining({
          duration: 3000,
          dismissible: true,
        })
      );

      unmount();
    });
  });

  describe("AC4: Debounced Status Changes", () => {
    it("8.3 debounces flapping connection: flapping → stable display", async () => {
      const { result, unmount } = renderHook(() => useConnectivity());

      // Rapid toggle sequence (connection flapping)
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
        await vi.advanceTimersByTimeAsync(500);
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(500);
        window.dispatchEvent(new Event("offline"));
        await vi.advanceTimersByTimeAsync(500);
        window.dispatchEvent(new Event("online"));
      });

      // During rapid changes, should be unstable (debouncing)
      expect(result.current.isStable).toBe(false);

      // Complete debounce period
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // After debounce, should be stable with final state (online)
      expect(result.current.isStable).toBe(true);
      expect(result.current.isOnline).toBe(true);

      unmount();
    });

    it("status only updates after stable state (2+ seconds)", async () => {
      const { result, unmount } = renderHook(() => useConnectivity());

      // Go offline
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
      });

      // Check at 1 second - should still show online (debouncing)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(result.current.isStable).toBe(false);
      // The actual isOnline should still be true (hasn't updated yet)
      expect(useConnectivityStore.getState().isOnline).toBe(true);

      // Complete remaining debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Now should be updated
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isStable).toBe(true);

      unmount();
    });
  });

  describe("SSR Safety", () => {
    it("8.4 handles SSR without hydration mismatch", () => {
      // Store defaults to online state (optimistic)
      const state = useConnectivityStore.getState();
      expect(state.isOnline).toBe(true);
      expect(state.isStable).toBe(true);

      // This ensures SSR renders with online state,
      // and client hydration won't have mismatch issues
      // since the store is reset each session
    });
  });

  describe("Store Integration", () => {
    it("store and hook stay in sync during state changes", async () => {
      const { result, unmount } = renderHook(() => useConnectivity());

      // Initial sync check
      expect(result.current.isOnline).toBe(
        useConnectivityStore.getState().isOnline
      );
      expect(result.current.isStable).toBe(
        useConnectivityStore.getState().isStable
      );

      // Change state via event
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Verify sync after change
      expect(result.current.isOnline).toBe(
        useConnectivityStore.getState().isOnline
      );
      expect(result.current.isStable).toBe(
        useConnectivityStore.getState().isStable
      );

      unmount();
    });
  });
});
