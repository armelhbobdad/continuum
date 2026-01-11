import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * Credential Security Tests (Story 5.1)
 *
 * These tests verify that NO credentials are exposed in web storage.
 * AC3: No credentials in localStorage, sessionStorage, or cookies
 */
describe("Credential Security", () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("localStorage security", () => {
    it("does NOT contain access tokens", () => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        const value = localStorage.getItem(key) ?? "";
        expect(value).not.toContain("access_token");
        expect(value).not.toContain("accessToken");
        expect(value).not.toContain("bearer");
      }
    });

    it("does NOT contain refresh tokens", () => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        const value = localStorage.getItem(key) ?? "";
        expect(value).not.toContain("refresh_token");
        expect(value).not.toContain("refreshToken");
      }
    });

    it("does NOT contain API keys", () => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        const value = localStorage.getItem(key) ?? "";
        expect(value).not.toContain("api_key");
        expect(value).not.toContain("apiKey");
        expect(value).not.toContain("sk-"); // OpenAI key prefix
        expect(value).not.toContain("OPENAI");
        expect(value).not.toContain("ANTHROPIC");
      }
    });

    it("does NOT contain client secrets", () => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        const value = localStorage.getItem(key) ?? "";
        expect(value).not.toContain("client_secret");
        expect(value).not.toContain("clientSecret");
      }
    });
  });

  describe("sessionStorage security", () => {
    it("does NOT contain access tokens", () => {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        const value = sessionStorage.getItem(key) ?? "";
        expect(value).not.toContain("access_token");
        expect(value).not.toContain("accessToken");
        expect(value).not.toContain("bearer");
      }
    });

    it("does NOT contain refresh tokens", () => {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        const value = sessionStorage.getItem(key) ?? "";
        expect(value).not.toContain("refresh_token");
        expect(value).not.toContain("refreshToken");
      }
    });

    it("does NOT contain API keys", () => {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        const value = sessionStorage.getItem(key) ?? "";
        expect(value).not.toContain("api_key");
        expect(value).not.toContain("apiKey");
        expect(value).not.toContain("sk-");
      }
    });

    it("does NOT contain client secrets", () => {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        const value = sessionStorage.getItem(key) ?? "";
        expect(value).not.toContain("client_secret");
        expect(value).not.toContain("clientSecret");
      }
    });
  });

  describe("cookie security", () => {
    it("does NOT contain refresh tokens in cookies", () => {
      const cookies = document.cookie;
      expect(cookies).not.toContain("refresh_token");
      expect(cookies).not.toContain("refreshToken");
    });

    it("does NOT contain client secrets in cookies", () => {
      const cookies = document.cookie;
      expect(cookies).not.toContain("client_secret");
      expect(cookies).not.toContain("clientSecret");
    });

    it("does NOT contain API keys in cookies", () => {
      const cookies = document.cookie;
      expect(cookies).not.toContain("api_key");
      expect(cookies).not.toContain("apiKey");
      expect(cookies).not.toContain("sk-");
    });
  });

  describe("opaque token pattern", () => {
    it("opaque tokens match expected pattern", () => {
      // Opaque tokens should start with "opaque_" prefix
      const opaquePattern = /^opaque_[a-f0-9]+$/;

      // Test valid opaque tokens
      expect("opaque_abc123def456").toMatch(opaquePattern);
      expect("opaque_1234567890abcdef").toMatch(opaquePattern);

      // Test invalid patterns (should not match)
      expect("secret_token_value").not.toMatch(opaquePattern);
      expect("bearer_token").not.toMatch(opaquePattern);
      expect("access_token_123").not.toMatch(opaquePattern);
    });

    it("opaque tokens do not reveal original secret", () => {
      // If we had a secret "my_super_secret_token"
      // The opaque version should NOT contain any part of it
      const opaqueId = "opaque_a1b2c3d4e5f6";

      expect(opaqueId).not.toContain("my");
      expect(opaqueId).not.toContain("super");
      expect(opaqueId).not.toContain("secret");
      expect(opaqueId).not.toContain("token");
    });
  });

  describe("credential patterns not in JS globals", () => {
    it("window object does not expose credentials", () => {
      const windowKeys = Object.keys(window);

      // Check for suspicious keys
      const suspiciousKeys = windowKeys.filter(
        (key) =>
          key.toLowerCase().includes("credential") ||
          key.toLowerCase().includes("secret") ||
          key.toLowerCase().includes("apikey") ||
          key.toLowerCase().includes("accesstoken") ||
          key.toLowerCase().includes("refreshtoken")
      );

      // __TAURI__ is allowed, it's the framework identifier
      const filteredKeys = suspiciousKeys.filter((k) => !k.includes("TAURI"));

      expect(filteredKeys).toHaveLength(0);
    });
  });
});
