/**
 * Hardware Store Tests
 * Story 2.1: Hardware Capability Detection
 * Tests for AC4, AC5, AC6
 */

import type { HardwareCapabilities } from "@continuum/platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @continuum/platform before importing the store
// The mock factory must not reference external variables (hoisting rules)
vi.mock("@continuum/platform", () => ({
  getHardwareCapabilities: vi.fn(),
}));

import { getHardwareCapabilities } from "@continuum/platform";
// Import store after mocking
import { useHardwareStore } from "../hardware";

// Get the mocked function for test setup
const mockGetHardwareCapabilities = getHardwareCapabilities as ReturnType<
  typeof vi.fn
>;

describe("useHardwareStore", () => {
  beforeEach(() => {
    // Reset store state
    useHardwareStore.setState({
      capabilities: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      _pollingInterval: undefined,
    });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup polling
    useHardwareStore.getState().stopPolling();
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should have null capabilities initially", () => {
      const state = useHardwareStore.getState();
      expect(state.capabilities).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe("fetchCapabilities", () => {
    it("should store capabilities on successful fetch", async () => {
      // Arrange
      const mockCapabilities: HardwareCapabilities = {
        ram: 16_384,
        cpuCores: 8,
        storageAvailable: 512_000,
        gpu: {
          name: "NVIDIA RTX 4090",
          vram: 24_576,
          computeCapable: true,
        },
        detectedBy: "desktop" as const,
        detectedAt: new Date(),
      };
      mockGetHardwareCapabilities.mockResolvedValue(mockCapabilities);

      // Act
      await useHardwareStore.getState().fetchCapabilities();

      // Assert
      const state = useHardwareStore.getState();
      expect(state.capabilities).toEqual(mockCapabilities);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it("should set isLoading to false after fetch completes", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 16_384,
        cpuCores: 8,
        storageAvailable: 512_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act
      await useHardwareStore.getState().fetchCapabilities();

      // Assert
      expect(useHardwareStore.getState().isLoading).toBe(false);
    });

    it("should set error on failed fetch", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockRejectedValue(
        new Error("Detection failed")
      );

      // Act
      await useHardwareStore.getState().fetchCapabilities();

      // Assert
      const state = useHardwareStore.getState();
      expect(state.capabilities).toBeNull();
      expect(state.error).toBe("Detection failed");
      expect(state.isLoading).toBe(false);
    });

    it("should handle non-Error rejection", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockRejectedValue("Unknown error");

      // Act
      await useHardwareStore.getState().fetchCapabilities();

      // Assert
      const state = useHardwareStore.getState();
      expect(state.error).toBe("Hardware detection failed");
    });
  });

  describe("Polling (AC6)", () => {
    it("should start polling and set interval", () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 8192,
        cpuCores: 4,
        storageAvailable: 256_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act
      useHardwareStore.getState().startPolling();

      // Assert - polling interval should be set
      expect(useHardwareStore.getState()._pollingInterval).toBeDefined();
    });

    it("should not start multiple polling intervals", () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 8192,
        cpuCores: 4,
        storageAvailable: 256_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act - call startPolling twice
      useHardwareStore.getState().startPolling();
      const firstInterval = useHardwareStore.getState()._pollingInterval;

      useHardwareStore.getState().startPolling();
      const secondInterval = useHardwareStore.getState()._pollingInterval;

      // Assert - should be the same interval
      expect(secondInterval).toBe(firstInterval);
    });

    it("should clear polling interval on stopPolling", () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 8192,
        cpuCores: 4,
        storageAvailable: 256_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act
      useHardwareStore.getState().startPolling();
      expect(useHardwareStore.getState()._pollingInterval).toBeDefined();

      useHardwareStore.getState().stopPolling();

      // Assert
      expect(useHardwareStore.getState()._pollingInterval).toBeUndefined();
    });

    it("should call fetchCapabilities when starting polling", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 8192,
        cpuCores: 4,
        storageAvailable: 256_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act
      useHardwareStore.getState().startPolling();

      // Need to flush microtasks for the async fetchCapabilities call
      await Promise.resolve();
      await Promise.resolve();

      // Assert
      expect(mockGetHardwareCapabilities).toHaveBeenCalled();
    });

    it("should refetch capabilities after 60 seconds (AC6)", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 8192,
        cpuCores: 4,
        storageAvailable: 256_000,
        gpu: null,
        detectedBy: "web" as const,
        detectedAt: new Date(),
      });

      // Act - start polling
      useHardwareStore.getState().startPolling();

      // Flush initial fetch
      await Promise.resolve();
      await Promise.resolve();

      // Initial call count
      const initialCallCount = mockGetHardwareCapabilities.mock.calls.length;

      // Advance timers by 60 seconds (polling interval)
      vi.advanceTimersByTime(60_000);

      // Flush the interval callback's async call
      await Promise.resolve();
      await Promise.resolve();

      // Assert - should have called again after 60 seconds
      expect(mockGetHardwareCapabilities.mock.calls.length).toBe(
        initialCallCount + 1
      );
    });

    it("should refetch multiple times at 60-second intervals (AC6)", async () => {
      // Arrange
      mockGetHardwareCapabilities.mockResolvedValue({
        ram: 16_384,
        cpuCores: 8,
        storageAvailable: 512_000,
        gpu: { name: "Test GPU", vram: 8192, computeCapable: true },
        detectedBy: "desktop" as const,
        detectedAt: new Date(),
      });

      // Act - start polling
      useHardwareStore.getState().startPolling();

      // Flush initial fetch
      await Promise.resolve();
      await Promise.resolve();

      const initialCallCount = mockGetHardwareCapabilities.mock.calls.length;

      // Advance by 3 polling intervals (180 seconds)
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(60_000);
        await Promise.resolve();
        await Promise.resolve();
      }

      // Assert - should have called 3 more times
      expect(mockGetHardwareCapabilities.mock.calls.length).toBe(
        initialCallCount + 3
      );
    });

    it("should handle stopPolling when not polling", () => {
      // Act - should not throw
      expect(() => {
        useHardwareStore.getState().stopPolling();
      }).not.toThrow();

      // Assert - interval should remain undefined
      expect(useHardwareStore.getState()._pollingInterval).toBeUndefined();
    });
  });

  describe("Memory-Only Store (ADR-HARDWARE-001)", () => {
    it("should not have persist middleware", () => {
      // The store should not have persist functionality
      // persist middleware adds 'persist' to the store api
      const store = useHardwareStore;

      // @ts-expect-error - checking for absence of persist
      expect(store.persist).toBeUndefined();
    });
  });
});
