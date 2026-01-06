import { beforeEach, describe, expect, it } from "vitest";
import { useConnectivityStore } from "../connectivity";

/**
 * Connectivity Store Tests
 *
 * Story 4.1: AC1, AC4
 * Memory-only store for tracking online/offline status with debounce support.
 */
describe("useConnectivityStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
    });
  });

  it("defaults to online and stable", () => {
    const state = useConnectivityStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.isStable).toBe(true);
  });

  it("defaults lastChecked to null", () => {
    const state = useConnectivityStore.getState();
    expect(state.lastChecked).toBeNull();
  });

  it("updates online status via setOnline", () => {
    const { setOnline } = useConnectivityStore.getState();
    setOnline(false);
    expect(useConnectivityStore.getState().isOnline).toBe(false);
  });

  it("records lastChecked timestamp when setOnline is called", () => {
    const before = new Date();
    const { setOnline } = useConnectivityStore.getState();
    setOnline(true);
    const { lastChecked } = useConnectivityStore.getState();

    expect(lastChecked).not.toBeNull();
    expect(lastChecked?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("marks unstable via markUnstable", () => {
    const { markUnstable } = useConnectivityStore.getState();
    markUnstable();
    expect(useConnectivityStore.getState().isStable).toBe(false);
  });

  it("marks stable via markStable", () => {
    const { markUnstable, markStable } = useConnectivityStore.getState();
    markUnstable();
    expect(useConnectivityStore.getState().isStable).toBe(false);
    markStable();
    expect(useConnectivityStore.getState().isStable).toBe(true);
  });

  it("preserves isOnline when marking stable/unstable", () => {
    const { setOnline, markUnstable, markStable } =
      useConnectivityStore.getState();

    setOnline(false);
    markUnstable();
    expect(useConnectivityStore.getState().isOnline).toBe(false);

    markStable();
    expect(useConnectivityStore.getState().isOnline).toBe(false);
  });

  it("is memory-only (no persist wrapper)", () => {
    // Verify the store is not wrapped with persist middleware
    // Memory-only stores don't have persist metadata
    const store = useConnectivityStore;

    // Check that the store doesn't have persist API
    // Persist stores have: persist.getOptions(), persist.clearStorage(), etc.
    expect((store as unknown as { persist?: unknown }).persist).toBeUndefined();
  });
});
