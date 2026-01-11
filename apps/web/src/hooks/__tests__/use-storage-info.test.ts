/**
 * useStorageInfo Hook Tests (Story 5.2)
 *
 * Tests for the storage info React hook.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageInfo, StorageTier } from "../../types/credentials";
import { useStorageInfo, useStorageTier } from "../use-storage-info";

// Mock Tauri invoke
const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("useStorageInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockStorageInfo: StorageInfo = {
    tier: "Keychain",
    display_name: "macOS Keychain",
    security_level: "Highest",
    description: "OS-managed credential storage",
    persists_on_restart: true,
  };

  it("should start with loading state", () => {
    // Promise that never resolves to test loading state
    mockInvoke.mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally empty - promise never resolves
        })
    );

    const { result } = renderHook(() => useStorageInfo());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should fetch storage info on mount", async () => {
    mockInvoke.mockResolvedValueOnce(mockStorageInfo);

    const { result } = renderHook(() => useStorageInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_storage_info");
    expect(result.current.storageInfo).toEqual(mockStorageInfo);
    expect(result.current.tier).toBe("Keychain");
    expect(result.current.persists).toBe(true);
    expect(result.current.isMemoryOnly).toBe(false);
  });

  it("should handle memory-only tier correctly", async () => {
    const memoryInfo: StorageInfo = {
      tier: "MemoryOnly",
      display_name: "Session Only",
      security_level: "Limited",
      description: "Memory-only storage",
      persists_on_restart: false,
    };

    mockInvoke.mockResolvedValueOnce(memoryInfo);

    const { result } = renderHook(() => useStorageInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMemoryOnly).toBe(true);
    expect(result.current.persists).toBe(false);
  });

  it("should handle fetch errors", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Failed to get storage info"));

    const { result } = renderHook(() => useStorageInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to get storage info");
    // Should use default storage info on error
    expect(result.current.storageInfo.tier).toBe("MemoryOnly");
  });

  it("should allow manual refetch", async () => {
    mockInvoke.mockResolvedValueOnce(mockStorageInfo);

    const { result } = renderHook(() => useStorageInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // Setup for refetch
    const updatedInfo: StorageInfo = {
      ...mockStorageInfo,
      tier: "Stronghold",
      display_name: "Encrypted Vault",
    };
    mockInvoke.mockResolvedValueOnce(updatedInfo);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.current.storageInfo.tier).toBe("Stronghold");
  });
});

describe("useStorageTier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch storage tier on mount", async () => {
    mockInvoke.mockResolvedValueOnce("Keychain" as StorageTier);

    const { result } = renderHook(() => useStorageTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockInvoke).toHaveBeenCalledWith("get_storage_tier");
    expect(result.current.tier).toBe("Keychain");
    expect(result.current.isMemoryOnly).toBe(false);
  });

  it("should detect memory-only mode", async () => {
    mockInvoke.mockResolvedValueOnce("MemoryOnly" as StorageTier);

    const { result } = renderHook(() => useStorageTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tier).toBe("MemoryOnly");
    expect(result.current.isMemoryOnly).toBe(true);
  });

  it("should handle fetch errors", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Backend error"));

    const { result } = renderHook(() => useStorageTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Backend error");
    expect(result.current.tier).toBe("MemoryOnly"); // Default fallback
  });

  it("should allow manual refetch", async () => {
    mockInvoke.mockResolvedValueOnce("Stronghold" as StorageTier);

    const { result } = renderHook(() => useStorageTier());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockInvoke.mockResolvedValueOnce("Keychain" as StorageTier);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.tier).toBe("Keychain");
  });
});
