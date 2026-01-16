import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCredentialStore } from "@/stores/credentials";
import type {
  OfflineValidationResult,
  RefreshResult,
} from "@/types/credentials";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import { useOfflineAuth } from "../use-offline-auth";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Get the mocked invoke function
const mockInvoke = vi.mocked(
  await import("@tauri-apps/api/core").then((m) => m.invoke)
);

// Mock __TAURI__ for Tauri environment detection
const mockTauri = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = {};
};

const unmockTauri = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = undefined;
};

describe("useOfflineAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset credential store
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
      offlineValidation: DEFAULT_OFFLINE_VALIDATION,
      degradedMode: "RequiresReauth",
      lastRefreshResult: null,
      isRefreshing: false,
    });

    // Mock Tauri environment by default
    mockTauri();
  });

  afterEach(() => {
    unmockTauri();
  });

  describe("initialization", () => {
    it("returns default values when not in Tauri environment", async () => {
      unmockTauri();

      const { result } = renderHook(() => useOfflineAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.degradedMode).toBe("RequiresReauth");
      expect(result.current.canWrite).toBe(false);
      expect(result.current.needsReauth).toBe(true);
    });

    it("validates offline credentials on mount", async () => {
      const mockValidation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      mockInvoke.mockResolvedValueOnce(mockValidation);

      const { result } = renderHook(() => useOfflineAuth());

      // Wait for effect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockInvoke).toHaveBeenCalledWith("validate_offline_credentials");
      expect(result.current.offlineValidation).toEqual(mockValidation);
      expect(result.current.degradedMode).toBe("FullAccess");
    });
  });

  describe("validateOffline", () => {
    it("calls Rust backend and updates state", async () => {
      const mockValidation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      mockInvoke.mockResolvedValue(mockValidation);

      const { result } = renderHook(() => useOfflineAuth());

      await act(async () => {
        await result.current.validateOffline();
      });

      expect(result.current.offlineValidation).toEqual(mockValidation);
      expect(result.current.daysRemaining).toBe(30);
      expect(result.current.needsRefresh).toBe(false);
    });

    it("handles not found error gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("NotFound"));

      const { result } = renderHook(() => useOfflineAuth());

      await act(async () => {
        await result.current.validateOffline();
      });

      // Should not set error for NotFound
      expect(result.current.error).toBeNull();
      expect(result.current.offlineValidation).toEqual(
        DEFAULT_OFFLINE_VALIDATION
      );
    });

    it("sets error for other errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Storage error"));

      const { result } = renderHook(() => useOfflineAuth());

      await act(async () => {
        await result.current.validateOffline();
      });

      expect(result.current.error).toBe("Storage error");
    });
  });

  describe("refreshCredentials", () => {
    it("calls Rust backend and returns result", async () => {
      const mockRefreshResult: RefreshResult = {
        success: true,
        error: null,
        requires_reauth: false,
        retry_after_ms: null,
      };

      const mockValidation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      // First call for refresh, second for re-validation
      mockInvoke
        .mockResolvedValueOnce(mockValidation) // initial mount validation
        .mockResolvedValueOnce(mockRefreshResult) // refresh call
        .mockResolvedValueOnce(mockValidation); // re-validation after refresh

      const { result } = renderHook(() => useOfflineAuth());

      // Wait for initial mount validation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        const refreshResult = await result.current.refreshCredentials();
        expect(refreshResult?.success).toBe(true);
      });

      expect(result.current.lastRefreshResult).toEqual(mockRefreshResult);
    });

    it("sets isRefreshing during refresh", async () => {
      mockInvoke.mockResolvedValueOnce(DEFAULT_OFFLINE_VALIDATION);

      // Create a delayed promise to test isRefreshing state
      let resolveRefresh: ((value: RefreshResult) => void) | undefined;
      mockInvoke.mockImplementationOnce(
        () =>
          new Promise<RefreshResult>((resolve) => {
            resolveRefresh = resolve;
          })
      );

      const { result } = renderHook(() => useOfflineAuth());

      // Wait for initial mount validation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Start refresh without awaiting
      act(() => {
        result.current.refreshCredentials();
      });

      // Should be refreshing while waiting
      expect(result.current.isRefreshing).toBe(true);

      // Resolve the refresh
      await act(async () => {
        resolveRefresh?.({
          success: true,
          error: null,
          requires_reauth: false,
          retry_after_ms: null,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isRefreshing).toBe(false);
    });

    it("handles refresh failure", async () => {
      mockInvoke.mockResolvedValueOnce(DEFAULT_OFFLINE_VALIDATION);
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useOfflineAuth());

      // Wait for initial mount validation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        const refreshResult = await result.current.refreshCredentials();
        expect(refreshResult?.success).toBe(false);
        expect(refreshResult?.error).toBe("Network error");
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("getDegradedMode", () => {
    it("returns degraded mode from backend", async () => {
      mockInvoke.mockResolvedValueOnce(DEFAULT_OFFLINE_VALIDATION);
      mockInvoke.mockResolvedValueOnce("ReadOnly");

      const { result } = renderHook(() => useOfflineAuth());

      // Wait for initial mount validation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        const mode = await result.current.getDegradedMode();
        expect(mode).toBe("ReadOnly");
      });

      expect(result.current.degradedMode).toBe("ReadOnly");
    });
  });

  describe("computed properties", () => {
    it("canWrite is true only in FullAccess mode", async () => {
      // Set up FullAccess mode
      useCredentialStore.getState().setDegradedMode("FullAccess");

      const { result } = renderHook(() => useOfflineAuth());

      expect(result.current.canWrite).toBe(true);

      // Change to ReadOnly
      act(() => {
        useCredentialStore.getState().setDegradedMode("ReadOnly");
      });

      expect(result.current.canWrite).toBe(false);
    });

    it("needsReauth is true only in RequiresReauth mode", async () => {
      useCredentialStore.getState().setDegradedMode("RequiresReauth");

      const { result } = renderHook(() => useOfflineAuth());

      expect(result.current.needsReauth).toBe(true);

      act(() => {
        useCredentialStore.getState().setDegradedMode("FullAccess");
      });

      expect(result.current.needsReauth).toBe(false);
    });
  });
});
