import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCredentialStore } from "@/stores/credentials";
import type { AuthState, OpaqueToken } from "@/types/credentials";
import { useCredentialBridge } from "../use-credential-bridge";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Import the mocked invoke
import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

// Mock window.__TAURI__ to indicate desktop environment
const mockTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = true;
};

const clearTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = undefined;
};

describe("useCredentialBridge", () => {
  beforeEach(() => {
    // Reset store
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
    });
    // Reset mocks
    vi.clearAllMocks();
    // Set up Tauri environment by default
    mockTauriWindow();
  });

  afterEach(() => {
    clearTauriWindow();
  });

  describe("initial state", () => {
    it("starts with loading true", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCredentialBridge());

      expect(result.current.isLoading).toBe(true);
    });

    it("starts with null auth state", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCredentialBridge());

      expect(result.current.authState).toBeNull();
    });

    it("starts not authenticated", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCredentialBridge());

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("refreshAuthState", () => {
    it("fetches auth state from Rust backend", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: "opaque_abc123",
        expiry_timestamp: Math.floor(Date.now() / 1000) + 3600,
        user_info: {
          id: "user_1",
          email: "test@example.com",
          display_name: "Test User",
        },
      };

      mockInvoke.mockResolvedValue(mockAuthState);

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_auth_status");
      expect(result.current.authState).toEqual(mockAuthState);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("handles errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Connection failed"));

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Connection failed");
      expect(result.current.authState?.status).toBe("NotStored");
    });
  });

  describe("getSessionToken", () => {
    it("returns opaque token from Rust backend", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: "opaque_session",
        expiry_timestamp: null,
        user_info: null,
      };

      const mockToken: OpaqueToken = {
        id: "opaque_token_xyz",
        expiry: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Session",
      };

      mockInvoke
        .mockResolvedValueOnce(mockAuthState) // Initial auth state fetch
        .mockResolvedValueOnce(mockToken); // Token fetch

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let token: OpaqueToken | null = null;
      await act(async () => {
        token = await result.current.getSessionToken();
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_session_token");
      expect(token).toEqual(mockToken);
      expect(result.current.sessionToken).toEqual(mockToken);
    });

    it("handles NotFound error as null (not authenticated)", async () => {
      const mockAuthState: AuthState = {
        status: "NotStored",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      };

      mockInvoke
        .mockResolvedValueOnce(mockAuthState)
        .mockRejectedValueOnce(new Error("No credentials stored"));

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let token: OpaqueToken | null = null;
      await act(async () => {
        token = await result.current.getSessionToken();
      });

      expect(token).toBeNull();
      expect(result.current.sessionToken).toBeNull();
      // Should not set error for NotFound
      expect(result.current.error).toBeNull();
    });
  });

  describe("clearCredentials", () => {
    it("clears credentials in Rust and store", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: "opaque_to_clear",
        expiry_timestamp: null,
        user_info: null,
      };

      mockInvoke
        .mockResolvedValueOnce(mockAuthState)
        .mockResolvedValueOnce(undefined); // clear_credentials returns void

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.authState?.status).toBe("Valid");
      });

      await act(async () => {
        await result.current.clearCredentials();
      });

      expect(mockInvoke).toHaveBeenCalledWith("clear_credentials");
      expect(result.current.authState).toBeNull();
      expect(result.current.sessionToken).toBeNull();
    });
  });

  describe("checkAvailability", () => {
    it("returns availability status from Rust backend", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: "opaque_available",
        expiry_timestamp: null,
        user_info: null,
      };

      mockInvoke
        .mockResolvedValueOnce(mockAuthState)
        .mockResolvedValueOnce(true);

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let available = false;
      await act(async () => {
        available = await result.current.checkAvailability();
      });

      expect(mockInvoke).toHaveBeenCalledWith("check_credential_availability");
      expect(available).toBe(true);
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when status is Valid and has session_id", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: "opaque_valid",
        expiry_timestamp: null,
        user_info: null,
      };

      mockInvoke.mockResolvedValue(mockAuthState);

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it("returns false when status is Expired", async () => {
      const mockAuthState: AuthState = {
        status: "Expired",
        session_id: "opaque_expired",
        expiry_timestamp: 0,
        user_info: null,
      };

      mockInvoke.mockResolvedValue(mockAuthState);

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it("returns false when session_id is null", async () => {
      const mockAuthState: AuthState = {
        status: "Valid",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      };

      mockInvoke.mockResolvedValue(mockAuthState);

      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("non-Tauri environment", () => {
    beforeEach(() => {
      clearTauriWindow();
    });

    it("returns default state in browser environment", async () => {
      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authState?.status).toBe("NotStored");
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("checkAvailability returns false in browser", async () => {
      const { result } = renderHook(() => useCredentialBridge());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let available = true;
      await act(async () => {
        available = await result.current.checkAvailability();
      });

      expect(available).toBe(false);
    });
  });
});
