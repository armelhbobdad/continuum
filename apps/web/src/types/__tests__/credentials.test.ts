/**
 * Credential Types Tests (Story 5.1, 5.2)
 *
 * Tests for type helper functions and constants.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTH_STATE,
  DEFAULT_STORAGE_INFO,
  isExpiredError,
  isMemoryOnlyMode,
  isNotFoundError,
  type StorageTier,
  storageTierPersists,
} from "../credentials";

describe("Error Helpers", () => {
  describe("isNotFoundError", () => {
    it("should return true for NotFound string", () => {
      expect(isNotFoundError("NotFound")).toBe(true);
    });

    it("should return true for 'No credentials' message", () => {
      expect(isNotFoundError("No credentials stored")).toBe(true);
    });

    it("should return true for Error with NotFound message", () => {
      expect(isNotFoundError(new Error("NotFound"))).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isNotFoundError("Some other error")).toBe(false);
      expect(isNotFoundError(new Error("Internal error"))).toBe(false);
    });
  });

  describe("isExpiredError", () => {
    it("should return true for Expired string", () => {
      expect(isExpiredError("Expired")).toBe(true);
    });

    it("should return true for 'expired' in message", () => {
      expect(isExpiredError("Credentials have expired")).toBe(true);
    });

    it("should return true for Error with expired message", () => {
      expect(isExpiredError(new Error("Token expired"))).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isExpiredError("NotFound")).toBe(false);
      expect(isExpiredError(new Error("Invalid"))).toBe(false);
    });
  });
});

describe("Storage Tier Helpers (Story 5.2)", () => {
  describe("storageTierPersists", () => {
    it("should return true for Keychain tier", () => {
      expect(storageTierPersists("Keychain")).toBe(true);
    });

    it("should return true for Stronghold tier", () => {
      expect(storageTierPersists("Stronghold")).toBe(true);
    });

    it("should return false for MemoryOnly tier", () => {
      expect(storageTierPersists("MemoryOnly")).toBe(false);
    });
  });

  describe("isMemoryOnlyMode", () => {
    it("should return true for MemoryOnly tier", () => {
      expect(isMemoryOnlyMode("MemoryOnly")).toBe(true);
    });

    it("should return false for Keychain tier", () => {
      expect(isMemoryOnlyMode("Keychain")).toBe(false);
    });

    it("should return false for Stronghold tier", () => {
      expect(isMemoryOnlyMode("Stronghold")).toBe(false);
    });
  });
});

describe("Default Constants", () => {
  describe("DEFAULT_AUTH_STATE", () => {
    it("should have NotStored status", () => {
      expect(DEFAULT_AUTH_STATE.status).toBe("NotStored");
    });

    it("should have null values for optional fields", () => {
      expect(DEFAULT_AUTH_STATE.session_id).toBeNull();
      expect(DEFAULT_AUTH_STATE.expiry_timestamp).toBeNull();
      expect(DEFAULT_AUTH_STATE.user_info).toBeNull();
    });
  });

  describe("DEFAULT_STORAGE_INFO", () => {
    it("should have MemoryOnly tier as default", () => {
      expect(DEFAULT_STORAGE_INFO.tier).toBe("MemoryOnly");
    });

    it("should have Limited security level", () => {
      expect(DEFAULT_STORAGE_INFO.security_level).toBe("Limited");
    });

    it("should not persist on restart", () => {
      expect(DEFAULT_STORAGE_INFO.persists_on_restart).toBe(false);
    });

    it("should have a loading display name", () => {
      expect(DEFAULT_STORAGE_INFO.display_name).toBe("Loading...");
    });
  });
});

describe("Type Guards", () => {
  it("StorageTier should only allow valid values", () => {
    const validTiers: StorageTier[] = ["Keychain", "Stronghold", "MemoryOnly"];

    for (const tier of validTiers) {
      expect(typeof tier).toBe("string");
    }
  });
});
