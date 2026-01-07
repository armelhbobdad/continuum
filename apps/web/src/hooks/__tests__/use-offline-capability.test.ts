import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { useModelStore } from "@/stores/models";
import { usePrivacyStore } from "@/stores/privacy";
import { useOfflineCapability } from "../use-offline-capability";

/**
 * useOfflineCapability Hook Tests
 *
 * Story 4.5: AC1, AC4 - Full offline functionality and cloud feature limitations
 * Tests offline capability detection based on model and connectivity state.
 */
describe("useOfflineCapability", () => {
  beforeEach(() => {
    // Reset stores to default state
    useConnectivityStore.setState({
      isOnline: true,
    });
    usePrivacyStore.setState({
      airplaneMode: false,
    });
    useModelStore.setState({
      downloadedModels: [],
    });
  });

  it("returns canWorkOffline=true when model is downloaded", () => {
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.canWorkOffline).toBe(true);
    expect(result.current.hasLocalModel).toBe(true);
    expect(result.current.offlineLimitationReason).toBeNull();
  });

  it("returns canWorkOffline=false when no model is downloaded", () => {
    useModelStore.setState({ downloadedModels: [] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.canWorkOffline).toBe(false);
    expect(result.current.hasLocalModel).toBe(false);
    expect(result.current.offlineLimitationReason).toBe(
      "No AI model downloaded. Download a model to work offline."
    );
  });

  it("returns isOffline=true when not online", () => {
    useConnectivityStore.setState({ isOnline: false });
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.isOffline).toBe(true);
  });

  it("returns isOffline=true when airplane mode is active", () => {
    useConnectivityStore.setState({ isOnline: true });
    usePrivacyStore.setState({ airplaneMode: true });
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.isOffline).toBe(true);
  });

  it("returns isOffline=false when online and not in airplane mode", () => {
    useConnectivityStore.setState({ isOnline: true });
    usePrivacyStore.setState({ airplaneMode: false });
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.isOffline).toBe(false);
  });

  it("returns expected offline features list", () => {
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.offlineFeatures).toContain("chat");
    expect(result.current.offlineFeatures).toContain("inference");
    expect(result.current.offlineFeatures).toContain("session-management");
    expect(result.current.offlineFeatures).toContain("session-history");
  });

  it("returns expected cloud-only features list", () => {
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result } = renderHook(() => useOfflineCapability());

    expect(result.current.cloudOnlyFeatures).toContain("cloud-inference");
    expect(result.current.cloudOnlyFeatures).toContain("model-download");
    expect(result.current.cloudOnlyFeatures).toContain("knowledge-sync");
  });

  it("returns stable reference across renders (memoization)", () => {
    useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });

    const { result, rerender } = renderHook(() => useOfflineCapability());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    // With same input state, should return same reference
    expect(firstResult).toBe(secondResult);
  });
});
