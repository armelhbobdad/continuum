import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCredentialStore } from "@/stores/credentials";
import type { AuthState, OpaqueToken } from "@/types/credentials";
import { useCredentialBridge } from "../use-credential-bridge";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

// Mock Tauri environment
const mockTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = true;
};

const clearTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = undefined;
};

/**
 * Integration Tests for Credential Bridge (Story 5.1)
 *
 * These tests verify the full integration between:
 * - TypeScript hook (useCredentialBridge)
 * - Zustand store (useCredentialStore)
 * - Mocked Tauri IPC (simulating Rust backend)
 *
 * AC1: All credentials stored in Rust backend
 * AC2: Opaque tokens via IPC
 * AC3: No credentials in web storage
 * AC4: Fast credential check on cold start
 */
describe("Credential Bridge Integration", () => {
  beforeEach(() => {
    // Reset store
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
    });
    vi.clearAllMocks();
    mockTauriWindow();
  });

  afterEach(() => {
    clearTauriWindow();
  });

  describe("full credential storage and retrieval flow", () => {
    it("completes full authentication lifecycle", async () => {
      // 1. Initial state - no credentials
      const initialAuthState: AuthState = {
        status: "NotStored",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      };

      // 2. After authentication - valid credentials
      const authenticatedState: AuthState = {
        status: "Valid",
        session_id: "opaque_session_12345",
        expiry_timestamp: Math.floor(Date.now() / 1000) + 3600,
        user_info: {
          id: "user_integration",
          email: "integration@test.com",
          display_name: "Integration User",
          picture: null,
        },
      };

      // 3. Session token
      const sessionToken: OpaqueToken = {
        id: "opaque_token_abcdef",
        expiry: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Session",
      };

      // Mock sequence: initial check, then auth, then token, then clear
      mockInvoke
        .mockResolvedValueOnce(initialAuthState) // Initial load
        .mockResolvedValueOnce(authenticatedState) // After refresh
        .mockResolvedValueOnce(sessionToken) // Get token
        .mockResolvedValueOnce(undefined); // Clear

      const { result } = renderHook(() => useCredentialBridge());

      // 1. Verify initial state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isAuthenticated).toBe(false);

      // 2. Simulate authentication (refresh after login)
      await act(async () => {
        await result.current.refreshAuthState();
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.authState?.user_info?.email).toBe(
        "integration@test.com"
      );

      // 3. Get session token
      let token: OpaqueToken | null = null;
      await act(async () => {
        token = await result.current.getSessionToken();
      });
      expect((token as OpaqueToken | null)?.id).toBe("opaque_token_abcdef");
      expect((token as OpaqueToken | null)?.id).toMatch(/^opaque_/); // Verify opaque pattern

      // 4. Logout - clear credentials
      await act(async () => {
        await result.current.clearCredentials();
      });
      expect(result.current.authState).toBeNull();
      expect(result.current.sessionToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("auth status check returns correct state", () => {
    it("returns NotStored when no credentials exist", async () => {
      mockInvoke.mockResolvedValue({
        status: "NotStored",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      });

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authState?.status).toBe("NotStored");
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("returns Valid when credentials are active", async () => {
      mockInvoke.mockResolvedValue({
        status: "Valid",
        session_id: "opaque_valid_session",
        expiry_timestamp: Math.floor(Date.now() / 1000) + 3600,
        user_info: null,
      });

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.authState?.status).toBe("Valid");
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it("returns Expired when credentials have expired", async () => {
      mockInvoke.mockResolvedValue({
        status: "Expired",
        session_id: "opaque_expired_session",
        expiry_timestamp: 0,
        user_info: null,
      });

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.authState?.status).toBe("Expired");
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("session token retrieval (opaque only)", () => {
    it("returns opaque token that does not contain secrets", async () => {
      mockInvoke
        .mockResolvedValueOnce({
          status: "Valid",
          session_id: "opaque_session",
          expiry_timestamp: null,
          user_info: null,
        })
        .mockResolvedValueOnce({
          id: "opaque_fedcba987654",
          expiry: Math.floor(Date.now() / 1000) + 3600,
          token_type: "Session",
        });

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let token: OpaqueToken | null = null;
      await act(async () => {
        token = await result.current.getSessionToken();
      });

      const tokenId = (token as OpaqueToken | null)?.id;

      // Verify opaque pattern
      expect(tokenId).toMatch(/^opaque_[a-f0-9]+$/);

      // Verify no credential-like strings
      expect(tokenId).not.toContain("secret");
      expect(tokenId).not.toContain("token");
      expect(tokenId).not.toContain("bearer");
      expect(tokenId).not.toContain("access");
    });
  });

  describe("credential clearing wipes all data", () => {
    it("clears both store and triggers Rust backend clear", async () => {
      mockInvoke
        .mockResolvedValueOnce({
          status: "Valid",
          session_id: "opaque_to_clear",
          expiry_timestamp: null,
          user_info: {
            id: "1",
            email: "test@test.com",
            display_name: "Test",
            picture: null,
          },
        })
        .mockResolvedValueOnce({
          id: "opaque_token_to_clear",
          expiry: 0,
          token_type: "Session",
        })
        .mockResolvedValueOnce(undefined); // clear_credentials

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.authState?.status).toBe("Valid");
      });

      // Get token first
      await act(async () => {
        await result.current.getSessionToken();
      });
      expect(result.current.sessionToken).not.toBeNull();

      // Clear credentials
      await act(async () => {
        await result.current.clearCredentials();
      });

      // Verify everything is cleared
      expect(result.current.authState).toBeNull();
      expect(result.current.sessionToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Verify Rust backend was called
      expect(mockInvoke).toHaveBeenCalledWith("clear_credentials");
    });
  });

  describe("cold start check completes < 500ms", () => {
    it("availability check completes within performance budget", async () => {
      mockInvoke
        .mockResolvedValueOnce({
          status: "NotStored",
          session_id: null,
          expiry_timestamp: null,
          user_info: null,
        })
        .mockResolvedValueOnce(false); // checkAvailability

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const start = performance.now();

      let available = false;
      await act(async () => {
        available = await result.current.checkAvailability();
      });

      const elapsed = performance.now() - start;

      // NFR-CRED-2: Must complete within 500ms
      // Note: This tests the mock, actual Rust test validates real performance
      expect(elapsed).toBeLessThan(500);
      expect(typeof available).toBe("boolean");
    });
  });

  describe("multiple concurrent auth status checks", () => {
    it("handles concurrent requests without race conditions", async () => {
      const authState: AuthState = {
        status: "Valid",
        session_id: "opaque_concurrent",
        expiry_timestamp: null,
        user_info: null,
      };

      // Simulate slight delay to test concurrency
      mockInvoke.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(authState), 10))
      );

      const { result } = renderHook(() => useCredentialBridge());

      // Fire multiple concurrent refreshes
      await act(async () => {
        await Promise.all([
          result.current.refreshAuthState(),
          result.current.refreshAuthState(),
          result.current.refreshAuthState(),
        ]);
      });

      // State should be consistent
      expect(result.current.authState?.status).toBe("Valid");
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("error handling for Tauri invoke failures", () => {
    it("handles network errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Network request failed"));

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network request failed");
      expect(result.current.authState?.status).toBe("NotStored");
    });

    it("handles timeout errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Request timed out"));

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Request timed out");
    });

    it("handles IPC errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC channel closed"));

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("IPC channel closed");
    });
  });
});
