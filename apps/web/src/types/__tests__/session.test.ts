/**
 * Session Types Tests (Story 5.5 Task 1.5)
 *
 * Tests for extended Session interface with owner and migration fields.
 */
import { describe, expect, it } from "vitest";
import type { Message, Session } from "../session";
import {
  generateAnonymousId,
  isAnonymousSession,
  isMigratedSession,
  isOwnedByUser,
} from "../session";

describe("Session Types (Story 5.5)", () => {
  describe("Extended Session Fields", () => {
    it("should allow session with null ownerId for anonymous users", () => {
      const session: Session = {
        id: "session-1",
        title: "Anonymous Session",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: null,
      };

      expect(session.ownerId).toBeNull();
    });

    it("should allow session with undefined ownerId for backward compatibility", () => {
      const session: Session = {
        id: "session-2",
        title: "Legacy Session",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(session.ownerId).toBeUndefined();
    });

    it("should allow session with user ownerId for authenticated users", () => {
      const session: Session = {
        id: "session-3",
        title: "Owned Session",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-123",
      };

      expect(session.ownerId).toBe("user-123");
    });

    it("should track anonymousId before migration", () => {
      const session: Session = {
        id: "session-4",
        title: "Pre-migration Session",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-123",
        anonymousId: "anon-device-456",
        migratedAt: new Date(),
      };

      expect(session.anonymousId).toBe("anon-device-456");
      expect(session.migratedAt).toBeInstanceOf(Date);
    });

    it("should have migratedAt when session was migrated", () => {
      const migratedAt = new Date("2026-01-13T10:00:00Z");
      const session: Session = {
        id: "session-5",
        title: "Migrated Session",
        messages: [],
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date(),
        ownerId: "user-789",
        anonymousId: "anon-device-101",
        migratedAt,
      };

      expect(session.migratedAt).toEqual(migratedAt);
    });

    it("should maintain message interface compatibility", () => {
      const message: Message = {
        id: "msg-1",
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
      };

      const session: Session = {
        id: "session-6",
        title: "Session with message",
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: null,
      };

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe("user");
    });
  });

  describe("isAnonymousSession helper", () => {
    it("should return true for null ownerId", () => {
      const session: Session = {
        id: "s1",
        title: "Anon",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: null,
      };
      expect(isAnonymousSession(session)).toBe(true);
    });

    it("should return true for undefined ownerId", () => {
      const session: Session = {
        id: "s2",
        title: "Anon",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(isAnonymousSession(session)).toBe(true);
    });

    it("should return false for owned session", () => {
      const session: Session = {
        id: "s3",
        title: "Owned",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-1",
      };
      expect(isAnonymousSession(session)).toBe(false);
    });
  });

  describe("isOwnedByUser helper", () => {
    it("should return true when ownerId matches", () => {
      const session: Session = {
        id: "s1",
        title: "Owned",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-123",
      };
      expect(isOwnedByUser(session, "user-123")).toBe(true);
    });

    it("should return false when ownerId does not match", () => {
      const session: Session = {
        id: "s2",
        title: "Owned",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-456",
      };
      expect(isOwnedByUser(session, "user-123")).toBe(false);
    });

    it("should return false for anonymous session", () => {
      const session: Session = {
        id: "s3",
        title: "Anon",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: null,
      };
      expect(isOwnedByUser(session, "user-123")).toBe(false);
    });
  });

  describe("isMigratedSession helper", () => {
    it("should return true for session with migratedAt", () => {
      const session: Session = {
        id: "s1",
        title: "Migrated",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-123",
        anonymousId: "anon-1",
        migratedAt: new Date(),
      };
      expect(isMigratedSession(session)).toBe(true);
    });

    it("should return false for session without migratedAt", () => {
      const session: Session = {
        id: "s2",
        title: "Not migrated",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: "user-123",
      };
      expect(isMigratedSession(session)).toBe(false);
    });
  });

  describe("generateAnonymousId helper", () => {
    it("should generate a stable device-based ID", () => {
      const id1 = generateAnonymousId();
      const id2 = generateAnonymousId();
      // Same device should get same ID
      expect(id1).toBe(id2);
    });

    it("should return a non-empty string", () => {
      const id = generateAnonymousId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
