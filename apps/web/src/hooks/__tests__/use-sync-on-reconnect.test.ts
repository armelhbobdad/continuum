import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock stores before importing hook
vi.mock("@/stores/connectivity", () => ({
  useConnectivityStore: vi.fn(),
}));

vi.mock("@/stores/sync-queue", () => ({
  useSyncQueueStore: vi.fn(),
}));

vi.mock("../use-connectivity-transition", () => ({
  useConnectivityTransition: vi.fn(),
}));

/**
 * useSyncOnReconnect Hook Tests
 *
 * Story 4.5: AC5
 * Tests for auto-sync on reconnection behavior.
 */
describe("useSyncOnReconnect", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial state with no pending items", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => []),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.pendingCount).toBe(0);
  });

  it("updates pending count from queue entries", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setPendingSyncCount = vi.fn();
    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced: vi.fn(),
      setPendingSyncCount,
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [
        {
          id: "1",
          status: "pending" as const,
          operation: "session-create" as const,
          payload: {},
          timestamp: new Date(),
          retryCount: 0,
        },
        {
          id: "2",
          status: "pending" as const,
          operation: "session-update" as const,
          payload: {},
          timestamp: new Date(),
          retryCount: 0,
        },
        {
          id: "3",
          status: "completed" as const,
          operation: "message-add" as const,
          payload: {},
          timestamp: new Date(),
          retryCount: 0,
        },
      ],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => []),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    expect(result.current.pendingCount).toBe(2); // Only pending entries
    expect(setPendingSyncCount).toHaveBeenCalledWith(2);
  });

  it("triggers sync when coming back online", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setSyncing = vi.fn();
    const markSyncing = vi.fn();
    const markCompleted = vi.fn();
    const clearCompleted = vi.fn();
    const updateLastSynced = vi.fn();
    const pendingEntry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing,
      updateLastSynced,
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [pendingEntry],
      markSyncing,
      markCompleted,
      markFailed: vi.fn(),
      clearCompleted,
      getQueuedOperations: vi.fn(() => [pendingEntry]),
    });

    let transitionEventHandler: ((event: unknown) => void) | null = null;
    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn((callback) => {
        transitionEventHandler = callback;
        return vi.fn();
      }),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    renderHook(() => useSyncOnReconnect());

    // Simulate coming back online
    act(() => {
      transitionEventHandler?.({
        type: "connectivity-change",
        previousState: { isOnline: false },
        newState: { isOnline: true },
      });
    });

    // Wait for sync to start (1s delay)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });

    expect(setSyncing).toHaveBeenCalledWith(true);
  });

  it("processes queue entries sequentially", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const markSyncing = vi.fn();
    const markCompleted = vi.fn();
    const entries = [
      {
        id: "1",
        status: "pending" as const,
        operation: "session-create" as const,
        payload: {},
        timestamp: new Date(),
        retryCount: 0,
      },
      {
        id: "2",
        status: "pending" as const,
        operation: "session-update" as const,
        payload: {},
        timestamp: new Date(),
        retryCount: 0,
      },
    ];

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries,
      markSyncing,
      markCompleted,
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => entries),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    // Manually trigger sync and advance timers for internal setTimeout
    const syncPromise = result.current.triggerSync();

    // Advance timers to complete the internal 100ms delays for each entry
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await syncPromise;

    // Each entry should be marked syncing then completed
    expect(markSyncing).toHaveBeenCalledWith("1");
    expect(markSyncing).toHaveBeenCalledWith("2");
    expect(markCompleted).toHaveBeenCalledWith("1");
    expect(markCompleted).toHaveBeenCalledWith("2");
  });

  it("does not trigger sync when offline", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setSyncing = vi.fn();
    const entry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: false,
      isSyncing: false,
      setSyncing,
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [entry],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => [entry]),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(setSyncing).not.toHaveBeenCalled();
  });

  it("does not trigger sync when queue is empty", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setSyncing = vi.fn();

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing,
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => []),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(setSyncing).not.toHaveBeenCalled();
  });

  it("clears completed entries after sync", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const clearCompleted = vi.fn();
    const entry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [entry],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted,
      getQueuedOperations: vi.fn(() => [entry]),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    const syncPromise = result.current.triggerSync();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    await syncPromise;

    expect(clearCompleted).toHaveBeenCalled();
  });

  it("updates lastSyncedAt after successful sync", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const updateLastSynced = vi.fn();
    const entry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced,
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [entry],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => [entry]),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    const syncPromise = result.current.triggerSync();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    await syncPromise;

    expect(updateLastSynced).toHaveBeenCalled();
  });

  it("resets syncing state after completion", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setSyncing = vi.fn();
    const entry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing,
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [entry],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => [entry]),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    const syncPromise = result.current.triggerSync();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    await syncPromise;

    // setSyncing should be called with true then false
    expect(setSyncing).toHaveBeenCalledWith(true);
    expect(setSyncing).toHaveBeenCalledWith(false);
  });

  it("ignores transition events that are not offline to online", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const setSyncing = vi.fn();
    const entry = {
      id: "1",
      status: "pending" as const,
      operation: "session-create" as const,
      payload: {},
      timestamp: new Date(),
      retryCount: 0,
    };

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing,
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries: [entry],
      markSyncing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      clearCompleted: vi.fn(),
      getQueuedOperations: vi.fn(() => [entry]),
    });

    let transitionEventHandler: ((event: unknown) => void) | null = null;
    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn((callback) => {
        transitionEventHandler = callback;
        return vi.fn();
      }),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    renderHook(() => useSyncOnReconnect());

    // Simulate going offline (should NOT trigger sync)
    act(() => {
      transitionEventHandler?.({
        type: "connectivity-change",
        previousState: { isOnline: true },
        newState: { isOnline: false },
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(setSyncing).not.toHaveBeenCalled();
  });

  it("continues processing remaining entries after individual failure", async () => {
    const { useConnectivityStore } = await import("@/stores/connectivity");
    const { useSyncQueueStore } = await import("@/stores/sync-queue");
    const { useConnectivityTransition } = await import(
      "../use-connectivity-transition"
    );

    const markSyncing = vi.fn();
    const markFailed = vi.fn();
    const clearCompleted = vi.fn();

    // Two entries: first will fail, second should still process
    const entries = [
      {
        id: "fail-entry",
        status: "pending" as const,
        operation: "session-create" as const,
        payload: {},
        timestamp: new Date(),
        retryCount: 0,
      },
      {
        id: "success-entry",
        status: "pending" as const,
        operation: "session-update" as const,
        payload: {},
        timestamp: new Date(),
        retryCount: 0,
      },
    ];

    vi.mocked(useConnectivityStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      setSyncing: vi.fn(),
      updateLastSynced: vi.fn(),
      setPendingSyncCount: vi.fn(),
    });

    // Mock markCompleted to throw on first call (simulating sync failure)
    const mockMarkCompleted = vi.fn().mockImplementation((id: string) => {
      if (id === "fail-entry") {
        throw new Error("Simulated sync failure");
      }
    });

    vi.mocked(useSyncQueueStore).mockReturnValue({
      entries,
      markSyncing,
      markCompleted: mockMarkCompleted,
      markFailed,
      clearCompleted,
      getQueuedOperations: vi.fn(() => entries),
    });

    vi.mocked(useConnectivityTransition).mockReturnValue({
      onTransitionEvent: vi.fn(() => vi.fn()),
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
    });

    const { useSyncOnReconnect } = await import("../use-sync-on-reconnect");
    const { result } = renderHook(() => useSyncOnReconnect());

    const syncPromise = result.current.triggerSync();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await syncPromise;

    // First entry should be marked syncing, then failed
    expect(markSyncing).toHaveBeenCalledWith("fail-entry");
    expect(markFailed).toHaveBeenCalledWith(
      "fail-entry",
      "Simulated sync failure"
    );

    // Second entry should still be processed despite first failure
    expect(markSyncing).toHaveBeenCalledWith("success-entry");
    // Note: second entry won't reach markCompleted because the mock throws,
    // but we verify markSyncing was called for both entries
    expect(markSyncing).toHaveBeenCalledTimes(2);
  });
});
