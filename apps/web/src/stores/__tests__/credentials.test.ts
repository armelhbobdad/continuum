import { beforeEach, describe, expect, it } from "vitest";
import type {
  AuthState,
  OfflineValidationResult,
  OpaqueToken,
} from "@/types/credentials";
import { DEFAULT_OFFLINE_VALIDATION } from "@/types/credentials";
import {
  selectCanWrite,
  selectIsAuthenticated,
  selectIsReadOnly,
  selectNeedsReauth,
  useCredentialStore,
} from "../credentials";

describe("useCredentialStore", () => {
  // Reset store before each test
  beforeEach(() => {
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
      offlineValidation: DEFAULT_OFFLINE_VALIDATION,
      degradedMode: "RequiresReauth",
      lastRefreshResult: null,
      isRefreshing: false,
    });
  });

  describe("initial state", () => {
    it("starts with null auth state", () => {
      const state = useCredentialStore.getState();
      expect(state.authState).toBeNull();
    });

    it("starts with null session token", () => {
      const state = useCredentialStore.getState();
      expect(state.sessionToken).toBeNull();
    });
  });

  describe("setAuthState", () => {
    it("sets auth state correctly", () => {
      const authState: AuthState = {
        status: "Valid",
        session_id: "opaque_abc123",
        expiry_timestamp: Math.floor(Date.now() / 1000) + 3600,
        user_info: {
          id: "user_1",
          email: "test@example.com",
          display_name: "Test User",
        },
      };

      useCredentialStore.getState().setAuthState(authState);

      expect(useCredentialStore.getState().authState).toEqual(authState);
    });

    it("updates existing auth state", () => {
      const initial: AuthState = {
        status: "Valid",
        session_id: "opaque_first",
        expiry_timestamp: null,
        user_info: null,
      };

      const updated: AuthState = {
        status: "Expired",
        session_id: "opaque_second",
        expiry_timestamp: 0,
        user_info: null,
      };

      useCredentialStore.getState().setAuthState(initial);
      expect(useCredentialStore.getState().authState?.status).toBe("Valid");

      useCredentialStore.getState().setAuthState(updated);
      expect(useCredentialStore.getState().authState?.status).toBe("Expired");
    });
  });

  describe("setSessionToken", () => {
    it("sets session token correctly", () => {
      const token: OpaqueToken = {
        id: "opaque_token_123",
        expiry: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Session",
      };

      useCredentialStore.getState().setSessionToken(token);

      expect(useCredentialStore.getState().sessionToken).toEqual(token);
    });

    it("can set token to null", () => {
      const token: OpaqueToken = {
        id: "opaque_token_123",
        expiry: Math.floor(Date.now() / 1000) + 3600,
        token_type: "Session",
      };

      useCredentialStore.getState().setSessionToken(token);
      expect(useCredentialStore.getState().sessionToken).not.toBeNull();

      useCredentialStore.getState().setSessionToken(null);
      expect(useCredentialStore.getState().sessionToken).toBeNull();
    });
  });

  describe("clearAuthState", () => {
    it("clears all auth state", () => {
      // Set up state
      useCredentialStore.getState().setAuthState({
        status: "Valid",
        session_id: "opaque_abc123",
        expiry_timestamp: null,
        user_info: { id: "1", email: null, display_name: null },
      });
      useCredentialStore.getState().setSessionToken({
        id: "opaque_token",
        expiry: 0,
        token_type: "Session",
      });

      // Clear
      useCredentialStore.getState().clearAuthState();

      // Verify cleared
      expect(useCredentialStore.getState().authState).toBeNull();
      expect(useCredentialStore.getState().sessionToken).toBeNull();
    });
  });

  describe("memory-only (no persistence)", () => {
    it("does not persist to localStorage", () => {
      useCredentialStore.getState().setAuthState({
        status: "Valid",
        session_id: "opaque_test",
        expiry_timestamp: null,
        user_info: null,
      });

      // Check localStorage for any credential-related keys
      const keys = Object.keys(localStorage);
      const credentialKeys = keys.filter(
        (k) =>
          k.toLowerCase().includes("credential") ||
          k.toLowerCase().includes("auth") ||
          k.toLowerCase().includes("token")
      );

      expect(credentialKeys.length).toBe(0);
    });

    it("does not persist to sessionStorage", () => {
      useCredentialStore.getState().setAuthState({
        status: "Valid",
        session_id: "opaque_test",
        expiry_timestamp: null,
        user_info: null,
      });

      // Check sessionStorage for any credential-related keys
      const keys = Object.keys(sessionStorage);
      const credentialKeys = keys.filter(
        (k) =>
          k.toLowerCase().includes("credential") ||
          k.toLowerCase().includes("auth") ||
          k.toLowerCase().includes("token")
      );

      expect(credentialKeys.length).toBe(0);
    });
  });

  // ========== Story 5.4: Offline Authentication Tests ==========

  describe("offline validation state (Story 5.4)", () => {
    it("starts with default offline validation", () => {
      const state = useCredentialStore.getState();
      expect(state.offlineValidation).toEqual(DEFAULT_OFFLINE_VALIDATION);
      expect(state.degradedMode).toBe("RequiresReauth");
    });

    it("sets offline validation result", () => {
      const validation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      useCredentialStore.getState().setOfflineValidation(validation);

      expect(useCredentialStore.getState().offlineValidation).toEqual(
        validation
      );
    });

    it("updates degraded mode when setting offline validation", () => {
      const validation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      useCredentialStore.getState().setOfflineValidation(validation);

      expect(useCredentialStore.getState().degradedMode).toBe("FullAccess");
    });

    it("can set degraded mode directly", () => {
      useCredentialStore.getState().setDegradedMode("ReadOnly");
      expect(useCredentialStore.getState().degradedMode).toBe("ReadOnly");
    });
  });

  describe("refresh state (Story 5.4)", () => {
    it("starts with no refresh result and not refreshing", () => {
      const state = useCredentialStore.getState();
      expect(state.lastRefreshResult).toBeNull();
      expect(state.isRefreshing).toBe(false);
    });

    it("sets refresh result", () => {
      const result = {
        success: true,
        error: null,
        requires_reauth: false,
        retry_after_ms: null,
      };

      useCredentialStore.getState().setRefreshResult(result);
      expect(useCredentialStore.getState().lastRefreshResult).toEqual(result);
    });

    it("sets refreshing state", () => {
      useCredentialStore.getState().setIsRefreshing(true);
      expect(useCredentialStore.getState().isRefreshing).toBe(true);

      useCredentialStore.getState().setIsRefreshing(false);
      expect(useCredentialStore.getState().isRefreshing).toBe(false);
    });
  });

  describe("clearAuthState clears offline state (Story 5.4)", () => {
    it("resets offline validation to default", () => {
      const validation: OfflineValidationResult = {
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: false,
      };

      useCredentialStore.getState().setOfflineValidation(validation);
      useCredentialStore.getState().setRefreshResult({
        success: true,
        error: null,
        requires_reauth: false,
        retry_after_ms: null,
      });

      useCredentialStore.getState().clearAuthState();

      expect(useCredentialStore.getState().offlineValidation).toEqual(
        DEFAULT_OFFLINE_VALIDATION
      );
      expect(useCredentialStore.getState().degradedMode).toBe("RequiresReauth");
      expect(useCredentialStore.getState().lastRefreshResult).toBeNull();
      expect(useCredentialStore.getState().isRefreshing).toBe(false);
    });
  });

  // ========== Story 5.4: Selector Tests ==========

  describe("selectIsAuthenticated", () => {
    it("returns false when no auth state", () => {
      expect(selectIsAuthenticated(useCredentialStore.getState())).toBe(false);
    });

    it("returns false when status is NotStored", () => {
      useCredentialStore.getState().setAuthState({
        status: "NotStored",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      });
      expect(selectIsAuthenticated(useCredentialStore.getState())).toBe(false);
    });

    it("returns true when status is Valid", () => {
      useCredentialStore.getState().setAuthState({
        status: "Valid",
        session_id: "opaque_123",
        expiry_timestamp: null,
        user_info: null,
      });
      expect(selectIsAuthenticated(useCredentialStore.getState())).toBe(true);
    });

    it("returns true when status is Expired but offline is valid", () => {
      useCredentialStore.getState().setAuthState({
        status: "Expired",
        session_id: "opaque_123",
        expiry_timestamp: 0,
        user_info: null,
      });
      useCredentialStore.getState().setOfflineValidation({
        is_valid: true,
        expires_at: Date.now() / 1000 + 86_400 * 30,
        mode: "FullAccess",
        days_remaining: 30,
        needs_refresh: true,
      });
      expect(selectIsAuthenticated(useCredentialStore.getState())).toBe(true);
    });

    it("returns false when status is Invalid", () => {
      useCredentialStore.getState().setAuthState({
        status: "Invalid",
        session_id: null,
        expiry_timestamp: null,
        user_info: null,
      });
      expect(selectIsAuthenticated(useCredentialStore.getState())).toBe(false);
    });
  });

  describe("selectCanWrite", () => {
    it("returns true only in FullAccess mode", () => {
      useCredentialStore.getState().setDegradedMode("FullAccess");
      expect(selectCanWrite(useCredentialStore.getState())).toBe(true);

      useCredentialStore.getState().setDegradedMode("ReadOnly");
      expect(selectCanWrite(useCredentialStore.getState())).toBe(false);

      useCredentialStore.getState().setDegradedMode("RequiresReauth");
      expect(selectCanWrite(useCredentialStore.getState())).toBe(false);
    });
  });

  describe("selectIsReadOnly", () => {
    it("returns true only in ReadOnly mode", () => {
      useCredentialStore.getState().setDegradedMode("ReadOnly");
      expect(selectIsReadOnly(useCredentialStore.getState())).toBe(true);

      useCredentialStore.getState().setDegradedMode("FullAccess");
      expect(selectIsReadOnly(useCredentialStore.getState())).toBe(false);
    });
  });

  describe("selectNeedsReauth", () => {
    it("returns true only in RequiresReauth mode", () => {
      useCredentialStore.getState().setDegradedMode("RequiresReauth");
      expect(selectNeedsReauth(useCredentialStore.getState())).toBe(true);

      useCredentialStore.getState().setDegradedMode("FullAccess");
      expect(selectNeedsReauth(useCredentialStore.getState())).toBe(false);
    });
  });
});
