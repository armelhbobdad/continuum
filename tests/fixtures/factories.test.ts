import { describe, expect, it } from "vitest";
import {
  createMany,
  createMessage,
  createSession,
  createUser,
} from "./factories";

// Regex patterns at module level for performance
const PRIVACY_MODE_PATTERN = /^(local-only|trusted-network|cloud-enhanced)$/;
const MESSAGE_ROLE_PATTERN = /^(user|assistant)$/;

describe("Test Factories", () => {
  describe("createUser", () => {
    it("creates a user with required fields", () => {
      const user = createUser();
      expect(user.id).toBeDefined();
      expect(user.email).toContain("@");
      expect(user.name).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("accepts overrides", () => {
      const user = createUser({ email: "test@example.com" });
      expect(user.email).toBe("test@example.com");
    });
  });

  describe("createSession", () => {
    it("creates a session with required fields", () => {
      const session = createSession();
      expect(session.id).toBeDefined();
      expect(session.title).toBeDefined();
      expect(session.privacyMode).toMatch(PRIVACY_MODE_PATTERN);
    });

    it("accepts overrides", () => {
      const session = createSession({ privacyMode: "local-only" });
      expect(session.privacyMode).toBe("local-only");
    });
  });

  describe("createMessage", () => {
    it("creates a message with required fields", () => {
      const message = createMessage();
      expect(message.id).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.role).toMatch(MESSAGE_ROLE_PATTERN);
    });
  });

  describe("createMany", () => {
    it("creates multiple items", () => {
      const users = createMany(createUser, 5);
      expect(users).toHaveLength(5);
      // Verify each user has unique ID
      const ids = new Set(users.map((u) => u.id));
      expect(ids.size).toBe(5);
    });
  });
});
