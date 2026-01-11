/**
 * usePreFlightChecks Hook Tests
 *
 * Tests for the pre-flight check execution and state management hook.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PreFlightCheck } from "@/types/preflight";

// Mock the preflight checks module
const mockRunAllChecks = vi.fn();
const mockCalculateOverallStatus = vi.fn();

vi.mock("@/lib/preflight/checks", () => ({
  runAllChecks: () => mockRunAllChecks(),
  calculateOverallStatus: (checks: PreFlightCheck[]) =>
    mockCalculateOverallStatus(checks),
}));

const createMockChecks = (): PreFlightCheck[] => [
  {
    id: "model-status",
    category: "model",
    name: "AI Model",
    status: "ready",
    message: "Phi-4 downloaded and verified",
  },
  {
    id: "storage-space",
    category: "storage",
    name: "Storage",
    status: "ready",
    message: "10.5GB available",
  },
  {
    id: "ram-availability",
    category: "ram",
    name: "Memory (RAM)",
    status: "ready",
    message: "16GB available (6GB required)",
  },
  {
    id: "knowledge-sync",
    category: "knowledge",
    name: "Knowledge Bases",
    status: "ready",
    message: "No knowledge bases configured",
  },
];

describe("usePreFlightChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAllChecks.mockResolvedValue(createMockChecks());
    mockCalculateOverallStatus.mockReturnValue("ready");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs checks on mount", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockRunAllChecks).toHaveBeenCalled();
    expect(result.current.checks).toHaveLength(4);
  });

  it("returns checks array from runAllChecks", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.checks).toEqual(createMockChecks());
  });

  it("starts with loading state true", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("sets loading to false after checks complete", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("computes overall status from checks", async () => {
    mockCalculateOverallStatus.mockReturnValue("warning");

    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overallStatus).toBe("warning");
  });

  it("provides runChecks function for manual re-run", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    mockRunAllChecks.mockClear();

    await act(async () => {
      await result.current.runChecks();
    });

    expect(mockRunAllChecks).toHaveBeenCalled();
  });

  it("provides rerunCheck function for individual check re-run", async () => {
    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    mockRunAllChecks.mockClear();

    await act(async () => {
      await result.current.rerunCheck("model-status");
    });

    // Should re-run all checks (simplified implementation)
    expect(mockRunAllChecks).toHaveBeenCalled();
  });

  it("handles errors during check execution", async () => {
    mockRunAllChecks.mockRejectedValue(new Error("Check failed"));

    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Check failed");
  });

  it("clears error on successful re-run", async () => {
    // First run fails
    mockRunAllChecks.mockRejectedValueOnce(new Error("Check failed"));

    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    // Second run succeeds
    mockRunAllChecks.mockResolvedValue(createMockChecks());

    await act(async () => {
      await result.current.runChecks();
    });

    expect(result.current.error).toBeNull();
  });

  it("returns ready as default overall status when no checks", async () => {
    mockRunAllChecks.mockResolvedValue([]);
    mockCalculateOverallStatus.mockReturnValue("ready");

    const { usePreFlightChecks } = await import("../use-preflight-checks");
    const { result } = renderHook(() => usePreFlightChecks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overallStatus).toBe("ready");
  });
});
