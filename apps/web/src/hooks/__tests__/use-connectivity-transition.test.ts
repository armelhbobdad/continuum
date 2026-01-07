import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock stores before importing hook
vi.mock("@/stores/connectivity", () => ({
  useConnectivityStore: vi.fn(),
}));

vi.mock("@/stores/privacy", () => ({
  usePrivacyStore: vi.fn(),
}));

/**
 * useConnectivityTransition Hook Tests
 *
 * Story 4.4: AC1, AC3, AC4
 * Tests for connectivity state transitions and partial response recovery.
 */
describe("useConnectivityTransition", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Reset module cache to get fresh hook instances
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns stable state initially", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result } = renderHook(() => useConnectivityTransition());

    expect(result.current.transitionState).toBe("stable");
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.partialResponse).toBeNull();
  });

  it("transitions to transitioning state on connectivity change", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = true;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    expect(result.current.transitionState).toBe("stable");

    // Change connectivity
    isOnline = false;
    rerender();

    // The transition happens synchronously in the useEffect
    expect(result.current.transitionState).toBe("transitioning");
  });

  it("transitions to recovering state when coming back online", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = false;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    // Start offline, then go online
    isOnline = true;
    rerender();

    // Should transition first
    expect(result.current.transitionState).toBe("transitioning");

    // After 500ms debounce, should enter recovering
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(result.current.transitionState).toBe("recovering");
  });

  it("returns to stable state after recovery period", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = false;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    // Go online
    isOnline = true;
    rerender();

    // Wait for full recovery cycle (500ms + 2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });

    expect(result.current.transitionState).toBe("stable");
    expect(result.current.isTransitioning).toBe(false);
  });

  it("preserves partial response when called", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: false,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result } = renderHook(() => useConnectivityTransition());

    act(() => {
      result.current.preservePartialResponse(
        "msg-1",
        "session-1",
        "Partial content..."
      );
    });

    expect(result.current.partialResponse).not.toBeNull();
    expect(result.current.partialResponse?.messageId).toBe("msg-1");
    expect(result.current.partialResponse?.sessionId).toBe("session-1");
    expect(result.current.partialResponse?.content).toBe("Partial content...");
    expect(result.current.partialResponse?.retryable).toBe(true);
  });

  it("clears partial response when called", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result } = renderHook(() => useConnectivityTransition());

    act(() => {
      result.current.preservePartialResponse("msg-1", "session-1", "Content");
    });

    expect(result.current.partialResponse).not.toBeNull();

    act(() => {
      result.current.clearPartialResponse();
    });

    expect(result.current.partialResponse).toBeNull();
  });

  it("emits transition events to subscribers", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = true;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    const eventHandler = vi.fn();
    const unsubscribe = result.current.onTransitionEvent(eventHandler);

    // Trigger transition
    isOnline = false;
    rerender();

    // Event is emitted synchronously in useEffect
    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler.mock.calls[0][0].type).toBe("connectivity-change");
    expect(eventHandler.mock.calls[0][0].previousState.isOnline).toBe(true);
    expect(eventHandler.mock.calls[0][0].newState.isOnline).toBe(false);

    unsubscribe();
  });

  it("emits response-interrupted event when preserving partial response", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: false,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result } = renderHook(() => useConnectivityTransition());

    const eventHandler = vi.fn();
    result.current.onTransitionEvent(eventHandler);

    act(() => {
      result.current.preservePartialResponse(
        "msg-1",
        "session-1",
        "Partial content"
      );
    });

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "response-interrupted",
        reason: "Connectivity lost during response",
      })
    );
  });

  it("unsubscribes from events correctly", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = true;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    const eventHandler = vi.fn();
    const unsubscribe = result.current.onTransitionEvent(eventHandler);

    // Unsubscribe before triggering transition
    unsubscribe();

    // Trigger transition
    isOnline = false;
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Event handler should NOT have been called after unsubscribe
    expect(eventHandler).not.toHaveBeenCalled();
  });

  it("handles mode change events", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let mode: "local-only" | "cloud-enhanced" = "local-only";
    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockImplementation(() => ({ mode }));

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    const eventHandler = vi.fn();
    result.current.onTransitionEvent(eventHandler);

    // Change mode
    mode = "cloud-enhanced";
    rerender();

    // Event is emitted synchronously in useEffect
    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler.mock.calls[0][0].type).toBe("mode-change");
    expect(eventHandler.mock.calls[0][0].previousState.mode).toBe("local-only");
    expect(eventHandler.mock.calls[0][0].newState.mode).toBe("cloud-enhanced");
  });

  it("prevents retry when offline", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: false,
      isStable: true,
    });
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result } = renderHook(() => useConnectivityTransition());

    act(() => {
      result.current.preservePartialResponse(
        "msg-1",
        "session-1",
        "Partial content"
      );
    });

    // Try to retry while offline
    await act(async () => {
      await result.current.retryPartialResponse();
    });

    // Partial response should still be preserved (retry blocked)
    expect(result.current.partialResponse).not.toBeNull();
    expect(result.current.partialResponse?.retryable).toBe(true);
  });

  it("goes to stable when going offline (not recovering)", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { usePrivacyStore } = await import("@/stores/privacy");

    let isOnline = true;
    vi.mocked(useConnectivityStore).mockImplementation(() => ({
      isOnline,
      isStable: true,
    }));
    vi.mocked(usePrivacyStore).mockReturnValue({ mode: "local-only" });

    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );
    const { result, rerender } = renderHook(() => useConnectivityTransition());

    // Go offline
    isOnline = false;
    rerender();

    // Wait for debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    // Should go straight to stable (not recovering, since we went offline)
    expect(result.current.transitionState).toBe("stable");
  });
});
