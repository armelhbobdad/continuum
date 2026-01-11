import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { useConnectivity } from "../use-connectivity";

// Mock fetch for heartbeat - resolves immediately to avoid timer issues
const mockFetch = vi.fn().mockResolvedValue({ ok: true });

// Mock AbortSignal.timeout to avoid timer issues with jsdom
const originalAbortSignal = globalThis.AbortSignal;
const mockAbortSignal = {
  ...originalAbortSignal,
  timeout: () => new AbortController().signal,
};

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock Tauri API for desktop tests
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

/**
 * useConnectivity Hook Tests
 *
 * Story 4.1: AC1, AC3, AC4
 * Comprehensive tests for connectivity monitoring with debounce.
 */
describe("useConnectivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset fetch mock
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });

    // Reset Tauri mock
    mockInvoke.mockReset();

    // Mock AbortSignal.timeout to avoid jsdom timer issues
    globalThis.AbortSignal = mockAbortSignal as unknown as typeof AbortSignal;

    // Reset connectivity store
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    globalThis.AbortSignal = originalAbortSignal;
  });

  it("returns current connectivity state from store", () => {
    const { result, unmount } = renderHook(() => useConnectivity());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isStable).toBe(true);
    expect(typeof result.current.checkNow).toBe("function");
    unmount();
  });

  it("performs initial heartbeat check on mount", async () => {
    const { unmount } = renderHook(() => useConnectivity());

    // Wait for initial effect to run
    await act(async () => {
      // Allow promises to resolve
      await vi.advanceTimersByTimeAsync(0);
    });

    // Heartbeat should have been called
    expect(mockFetch).toHaveBeenCalled();
    unmount();
  });

  it("detects offline via navigator event", async () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    // Set navigator.onLine to false
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Advance past debounce (2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.isOnline).toBe(false);
    unmount();
  });

  it("detects online via navigator event", async () => {
    // Start offline
    useConnectivityStore.setState({ isOnline: false });
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { result, unmount } = renderHook(() => useConnectivity());

    // Set navigator.onLine to true
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });

    // Simulate online event
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Advance past debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.isOnline).toBe(true);
    unmount();
  });

  it("marks unstable during debounce period", () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Should be unstable during debounce
    expect(result.current.isStable).toBe(false);
    unmount();
  });

  it("marks stable after debounce completes", async () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isStable).toBe(false);

    // Advance past debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.isStable).toBe(true);
    unmount();
  });

  it("debounces rapid status changes (avoids flicker)", async () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    // Rapid toggle - go offline
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Wait 500ms (less than debounce)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Rapid toggle - go online before debounce completes
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Wait another 500ms (1000ms total, still less than debounce)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Should still be unstable (not updated yet because last event restarted debounce)
    expect(result.current.isStable).toBe(false);

    // Complete debounce (2100ms from last event)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Final state should be online (last event wins)
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isStable).toBe(true);
    unmount();
  });

  it("shows toast on reconnection after being offline", async () => {
    const { toast } = await import("sonner");

    // Start offline and mark wasOffline ref by going through the cycle
    useConnectivityStore.setState({ isOnline: false });
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { unmount } = renderHook(() => useConnectivity());

    // Trigger offline event and complete debounce to set wasOfflineRef
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Now come back online
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Back online",
      expect.objectContaining({
        duration: 3000,
        dismissible: true,
      })
    );
    unmount();
  });

  it("does not show toast when initially online", async () => {
    const { toast } = await import("sonner");

    const { unmount } = renderHook(() => useConnectivity());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(toast.success).not.toHaveBeenCalled();
    unmount();
  });

  it("provides checkNow function for manual connectivity check", async () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    expect(typeof result.current.checkNow).toBe("function");

    // Mock fetch to return online
    mockFetch.mockResolvedValueOnce({ ok: true });

    let checkResult: boolean | undefined;
    await act(async () => {
      checkResult = await result.current.checkNow();
    });

    expect(checkResult).toBe(true);
    unmount();
  });

  it("handles fetch failure as offline when navigator says offline", async () => {
    // Set navigator to offline so fetch is not attempted
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { result, unmount } = renderHook(() => useConnectivity());

    let checkResult: boolean | undefined;
    await act(async () => {
      checkResult = await result.current.checkNow();
    });

    // Should return false because navigator.onLine is false
    expect(checkResult).toBe(false);
    unmount();
  });

  it("handles fetch network error as offline", async () => {
    const { result, unmount } = renderHook(() => useConnectivity());

    // Wait for initial effect to settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Now configure fetch to fail for the checkNow call
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    let checkResult: boolean | undefined;
    await act(async () => {
      checkResult = await result.current.checkNow();
    });

    // Fetch failure should return false
    expect(checkResult).toBe(false);
    unmount();
  });

  it("cleans up event listeners on unmount", () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    const removeEventSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useConnectivity());

    expect(addEventSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addEventSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeEventSpy).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });

  describe("Tauri Desktop Integration (Task 6.5)", () => {
    const originalTauri = (globalThis as Record<string, unknown>).__TAURI__;

    afterEach(() => {
      // Restore original __TAURI__ state
      if (originalTauri === undefined) {
        (globalThis as Record<string, unknown>).__TAURI__ = undefined;
      } else {
        (globalThis as Record<string, unknown>).__TAURI__ = originalTauri;
      }
    });

    it("uses Tauri invoke API when __TAURI__ is present", async () => {
      // Set up Tauri environment
      (globalThis as Record<string, unknown>).__TAURI__ = { version: "2.0.0" };
      mockInvoke.mockResolvedValue(true);

      const { result, unmount } = renderHook(() => useConnectivity());

      // Wait for initial heartbeat
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should have called Tauri invoke instead of fetch
      expect(mockInvoke).toHaveBeenCalledWith("check_connectivity");
      expect(result.current.isOnline).toBe(true);
      unmount();
    });

    it("returns offline when Tauri invoke returns false", async () => {
      // Set up Tauri environment
      (globalThis as Record<string, unknown>).__TAURI__ = { version: "2.0.0" };
      mockInvoke.mockResolvedValue(false);

      const { result, unmount } = renderHook(() => useConnectivity());

      // Wait for initial heartbeat to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Clear previous calls from initial heartbeat
      mockInvoke.mockClear();

      // Trigger manual check
      let checkResult: boolean | undefined;
      await act(async () => {
        checkResult = await result.current.checkNow();
      });

      expect(mockInvoke).toHaveBeenCalledWith("check_connectivity");
      expect(checkResult).toBe(false);
      unmount();
    });

    it("falls back to browser detection when Tauri invoke fails", async () => {
      // Set up Tauri environment but make invoke fail
      (globalThis as Record<string, unknown>).__TAURI__ = { version: "2.0.0" };
      mockInvoke.mockRejectedValue(new Error("Tauri invoke failed"));

      const { result, unmount } = renderHook(() => useConnectivity());

      // Trigger manual check
      let checkResult: boolean | undefined;
      await act(async () => {
        checkResult = await result.current.checkNow();
      });

      // Should have tried Tauri first
      expect(mockInvoke).toHaveBeenCalledWith("check_connectivity");
      // Then fallen back to fetch (navigator.onLine is true by default)
      expect(mockFetch).toHaveBeenCalled();
      // Should return true since fetch mock returns ok: true
      expect(checkResult).toBe(true);
      unmount();
    });

    it("uses browser detection when __TAURI__ is not present", async () => {
      // Ensure no Tauri environment
      (globalThis as Record<string, unknown>).__TAURI__ = undefined;

      const { unmount } = renderHook(() => useConnectivity());

      // Wait for initial heartbeat
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should NOT have called Tauri invoke
      expect(mockInvoke).not.toHaveBeenCalled();
      // Should have used fetch instead
      expect(mockFetch).toHaveBeenCalled();
      unmount();
    });
  });
});
