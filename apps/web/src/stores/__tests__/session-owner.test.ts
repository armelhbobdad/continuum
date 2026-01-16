/**
 * Session Owner Selectors Tests (Story 5.5 Task 1.4, 1.5)
 *
 * Tests for owner-based session filtering selectors.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "@/types/session";
import {
  selectAnonymousSessionCount,
  selectAnonymousSessions,
  selectHasAnonymousSessions,
  selectMigratedSessions,
  selectSessionsByOwner,
  useSessionStore,
} from "../session";

describe("Session Owner Selectors (Story 5.5)", () => {
  // Create mock sessions for testing
  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: crypto.randomUUID(),
    title: "Test Session",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    // Reset session store before each test
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
      expandedSummaries: new Set<string>(),
    });
  });

  describe("selectAnonymousSessions", () => {
    it("should return sessions with null ownerId", () => {
      const anonymousSession = createMockSession({ ownerId: null });
      const ownedSession = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [anonymousSession, ownedSession],
      });

      const state = useSessionStore.getState();
      const result = selectAnonymousSessions(state);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(anonymousSession.id);
    });

    it("should return sessions with undefined ownerId", () => {
      const legacySession = createMockSession({ ownerId: undefined });
      const ownedSession = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [legacySession, ownedSession],
      });

      const state = useSessionStore.getState();
      const result = selectAnonymousSessions(state);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(legacySession.id);
    });

    it("should return empty array when no anonymous sessions exist", () => {
      const ownedSession = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [ownedSession],
      });

      const state = useSessionStore.getState();
      const result = selectAnonymousSessions(state);

      expect(result).toHaveLength(0);
    });

    it("should return all sessions when all are anonymous", () => {
      const session1 = createMockSession({ ownerId: null });
      const session2 = createMockSession({ ownerId: undefined });

      useSessionStore.setState({
        sessions: [session1, session2],
      });

      const state = useSessionStore.getState();
      const result = selectAnonymousSessions(state);

      expect(result).toHaveLength(2);
    });
  });

  describe("selectSessionsByOwner", () => {
    it("should return sessions owned by specific user", () => {
      const user1Session = createMockSession({ ownerId: "user-1" });
      const user2Session = createMockSession({ ownerId: "user-2" });
      const anonymousSession = createMockSession({ ownerId: null });

      useSessionStore.setState({
        sessions: [user1Session, user2Session, anonymousSession],
      });

      const state = useSessionStore.getState();
      const result = selectSessionsByOwner("user-1")(state);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(user1Session.id);
    });

    it("should return empty array when user has no sessions", () => {
      const otherSession = createMockSession({ ownerId: "user-other" });

      useSessionStore.setState({
        sessions: [otherSession],
      });

      const state = useSessionStore.getState();
      const result = selectSessionsByOwner("user-123")(state);

      expect(result).toHaveLength(0);
    });

    it("should return multiple sessions for same user", () => {
      const session1 = createMockSession({ ownerId: "user-123" });
      const session2 = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [session1, session2],
      });

      const state = useSessionStore.getState();
      const result = selectSessionsByOwner("user-123")(state);

      expect(result).toHaveLength(2);
    });
  });

  describe("selectHasAnonymousSessions", () => {
    it("should return true when anonymous sessions exist", () => {
      const anonymousSession = createMockSession({ ownerId: null });

      useSessionStore.setState({
        sessions: [anonymousSession],
      });

      const state = useSessionStore.getState();
      expect(selectHasAnonymousSessions(state)).toBe(true);
    });

    it("should return false when no anonymous sessions exist", () => {
      const ownedSession = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [ownedSession],
      });

      const state = useSessionStore.getState();
      expect(selectHasAnonymousSessions(state)).toBe(false);
    });

    it("should return false when sessions array is empty", () => {
      useSessionStore.setState({
        sessions: [],
      });

      const state = useSessionStore.getState();
      expect(selectHasAnonymousSessions(state)).toBe(false);
    });

    it("should return true for legacy sessions with undefined ownerId", () => {
      const legacySession = createMockSession({ ownerId: undefined });

      useSessionStore.setState({
        sessions: [legacySession],
      });

      const state = useSessionStore.getState();
      expect(selectHasAnonymousSessions(state)).toBe(true);
    });
  });

  describe("selectAnonymousSessionCount", () => {
    it("should return count of anonymous sessions", () => {
      const anon1 = createMockSession({ ownerId: null });
      const anon2 = createMockSession({ ownerId: undefined });
      const owned = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [anon1, anon2, owned],
      });

      const state = useSessionStore.getState();
      expect(selectAnonymousSessionCount(state)).toBe(2);
    });

    it("should return 0 when no anonymous sessions", () => {
      const owned = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [owned],
      });

      const state = useSessionStore.getState();
      expect(selectAnonymousSessionCount(state)).toBe(0);
    });

    it("should return 0 for empty sessions array", () => {
      useSessionStore.setState({
        sessions: [],
      });

      const state = useSessionStore.getState();
      expect(selectAnonymousSessionCount(state)).toBe(0);
    });
  });

  describe("selectMigratedSessions", () => {
    it("should return sessions with migratedAt timestamp", () => {
      const migratedSession = createMockSession({
        ownerId: "user-123",
        anonymousId: "anon-device-1",
        migratedAt: new Date(),
      });
      const regularSession = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [migratedSession, regularSession],
      });

      const state = useSessionStore.getState();
      const result = selectMigratedSessions(state);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(migratedSession.id);
    });

    it("should return empty array when no sessions have been migrated", () => {
      const session1 = createMockSession({ ownerId: null });
      const session2 = createMockSession({ ownerId: "user-123" });

      useSessionStore.setState({
        sessions: [session1, session2],
      });

      const state = useSessionStore.getState();
      const result = selectMigratedSessions(state);

      expect(result).toHaveLength(0);
    });

    it("should return multiple migrated sessions", () => {
      const migrated1 = createMockSession({
        ownerId: "user-123",
        migratedAt: new Date("2026-01-01"),
      });
      const migrated2 = createMockSession({
        ownerId: "user-123",
        migratedAt: new Date("2026-01-02"),
      });

      useSessionStore.setState({
        sessions: [migrated1, migrated2],
      });

      const state = useSessionStore.getState();
      const result = selectMigratedSessions(state);

      expect(result).toHaveLength(2);
    });
  });
});
