import { beforeEach, describe, expect, it } from "vitest";
import type { AuthState, OpaqueToken } from "@/types/credentials";
import { useCredentialStore } from "../credentials";

describe("useCredentialStore", () => {
  // Reset store before each test
  beforeEach(() => {
    useCredentialStore.setState({
      authState: null,
      sessionToken: null,
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
});
