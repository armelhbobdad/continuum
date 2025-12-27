/**
 * Session Store Unit Tests
 *
 * Tests for Zustand session store functionality.
 * Story 1.3: AC #5 (auto-session creation)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { type Message, type Session, useSessionStore } from "@/stores/session";

describe("Session Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  describe("Initial State", () => {
    it("starts with empty sessions array", () => {
      const state = useSessionStore.getState();
      expect(state.sessions).toEqual([]);
    });

    it("starts with null activeSessionId", () => {
      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBeNull();
    });
  });

  describe("createSession", () => {
    it("creates a new session with correct structure", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Hello, how are you?");

      // Get fresh state after mutation
      const updatedState = useSessionStore.getState();
      const session = updatedState.sessions.find(
        (s: Session) => s.id === sessionId
      );
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.messages).toEqual([]);
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.updatedAt).toBeInstanceOf(Date);
    });

    it("generates UUID for session id", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test message");

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("sets title from first message (max 50 chars)", () => {
      const state = useSessionStore.getState();
      const shortMessage = "Short title";
      state.createSession(shortMessage);

      const updatedState = useSessionStore.getState();
      expect(updatedState.sessions[0]?.title).toBe("Short title");
    });

    it("truncates title with ellipsis if message exceeds 50 chars", () => {
      const state = useSessionStore.getState();
      const longMessage =
        "This is a very long message that definitely exceeds fifty characters";
      state.createSession(longMessage);

      const updatedState = useSessionStore.getState();
      expect(updatedState.sessions[0]?.title).toBe(
        "This is a very long message that definitely exceed..."
      );
      expect(updatedState.sessions[0]?.title.length).toBeLessThanOrEqual(53);
    });

    it("sets the new session as active", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const updatedState = useSessionStore.getState();
      expect(updatedState.activeSessionId).toBe(sessionId);
    });

    it("adds new sessions to the beginning of the list", () => {
      const state = useSessionStore.getState();
      state.createSession("First session");

      const stateAfterFirst = useSessionStore.getState();
      stateAfterFirst.createSession("Second session");

      const finalState = useSessionStore.getState();
      expect(finalState.sessions[0]?.title).toBe("Second session");
      expect(finalState.sessions[1]?.title).toBe("First session");
    });
  });

  describe("addMessage", () => {
    it("adds a message to the specified session", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test session");

      const updatedState = useSessionStore.getState();
      updatedState.addMessage(sessionId, {
        role: "user",
        content: "Hello AI!",
      });

      const finalState = useSessionStore.getState();
      const session = finalState.sessions.find(
        (s: Session) => s.id === sessionId
      );
      expect(session?.messages).toHaveLength(1);
      expect(session?.messages[0]?.content).toBe("Hello AI!");
      expect(session?.messages[0]?.role).toBe("user");
    });

    it("generates UUID for message id", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const updatedState = useSessionStore.getState();
      updatedState.addMessage(sessionId, {
        role: "user",
        content: "Test message",
      });

      const finalState = useSessionStore.getState();
      const session = finalState.sessions.find(
        (s: Session) => s.id === sessionId
      );
      expect(session?.messages[0]?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("adds timestamp to message", () => {
      const before = new Date();
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const updatedState = useSessionStore.getState();
      updatedState.addMessage(sessionId, {
        role: "assistant",
        content: "Hi there!",
      });
      const after = new Date();

      const finalState = useSessionStore.getState();
      const session = finalState.sessions.find(
        (s: Session) => s.id === sessionId
      );
      const timestamp = session?.messages[0]?.timestamp;

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp?.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("updates session updatedAt timestamp", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const stateAfterCreate = useSessionStore.getState();
      const initialUpdatedAt = stateAfterCreate.sessions.find(
        (s: Session) => s.id === sessionId
      )?.updatedAt;

      // Small delay to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait 10ms
      }

      const updatedState = useSessionStore.getState();
      updatedState.addMessage(sessionId, {
        role: "user",
        content: "New message",
      });

      const finalState = useSessionStore.getState();
      const finalUpdatedAt = finalState.sessions.find(
        (s: Session) => s.id === sessionId
      )?.updatedAt;

      expect(finalUpdatedAt?.getTime()).toBeGreaterThan(
        initialUpdatedAt?.getTime() ?? 0
      );
    });

    it("preserves existing messages when adding new one", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const state1 = useSessionStore.getState();
      state1.addMessage(sessionId, { role: "user", content: "First" });

      const state2 = useSessionStore.getState();
      state2.addMessage(sessionId, { role: "assistant", content: "Second" });

      const finalState = useSessionStore.getState();
      const session = finalState.sessions.find(
        (s: Session) => s.id === sessionId
      );
      expect(session?.messages).toHaveLength(2);
      expect(session?.messages[0]?.content).toBe("First");
      expect(session?.messages[1]?.content).toBe("Second");
    });
  });

  describe("setActiveSession", () => {
    it("sets the active session id", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test");

      const updatedState = useSessionStore.getState();
      updatedState.setActiveSession(null);

      const nullState = useSessionStore.getState();
      expect(nullState.activeSessionId).toBeNull();

      nullState.setActiveSession(sessionId);
      const finalState = useSessionStore.getState();
      expect(finalState.activeSessionId).toBe(sessionId);
    });

    it("can set active session to null", () => {
      const state = useSessionStore.getState();
      state.createSession("Test");

      const updatedState = useSessionStore.getState();
      updatedState.setActiveSession(null);

      const finalState = useSessionStore.getState();
      expect(finalState.activeSessionId).toBeNull();
    });
  });

  describe("getActiveSession", () => {
    it("returns undefined when no active session", () => {
      const state = useSessionStore.getState();
      expect(state.getActiveSession()).toBeUndefined();
    });

    it("returns the active session when one exists", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Active session");

      const updatedState = useSessionStore.getState();
      const activeSession = updatedState.getActiveSession();

      expect(activeSession).toBeDefined();
      expect(activeSession?.id).toBe(sessionId);
      expect(activeSession?.title).toBe("Active session");
    });

    it("returns correct session after switching", () => {
      const state = useSessionStore.getState();
      const session1Id = state.createSession("First");

      const state1 = useSessionStore.getState();
      const session2Id = state1.createSession("Second");

      const state2 = useSessionStore.getState();
      state2.setActiveSession(session1Id);

      const finalState = useSessionStore.getState();
      const activeSession = finalState.getActiveSession();
      expect(activeSession?.title).toBe("First");
    });
  });

  describe("Type Definitions", () => {
    it("Message type has required properties", () => {
      const message: Message = {
        id: "test-id",
        role: "user",
        content: "Test content",
        timestamp: new Date(),
      };

      expect(message.id).toBeDefined();
      expect(message.role).toBe("user");
      expect(message.content).toBe("Test content");
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it("Session type has required properties", () => {
      const session: Session = {
        id: "test-session",
        title: "Test Session",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(session.id).toBeDefined();
      expect(session.title).toBe("Test Session");
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it("role can be user or assistant", () => {
      const userMessage: Message = {
        id: "1",
        role: "user",
        content: "User msg",
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: "2",
        role: "assistant",
        content: "AI msg",
        timestamp: new Date(),
      };

      expect(userMessage.role).toBe("user");
      expect(assistantMessage.role).toBe("assistant");
    });
  });
});
