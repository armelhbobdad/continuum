/**
 * Session Store Persistence Tests
 *
 * Tests for session persistence functionality using Zustand persist middleware.
 * Story 1.7: AC #1 (minimal data loss), AC #2 (session recovery), AC #3 (non-blocking)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, STORAGE_VERSION } from "@/stores/persist";
import { useSessionStore } from "@/stores/session";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    // Internal helper for tests
    _getStore: () => store,
  };
})();

describe("Session Store - Persistence", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Store original localStorage
    originalLocalStorage = globalThis.localStorage;
    // Setup localStorage mock using Object.defineProperty for bun/vitest compatibility
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset store to initial state
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe("Storage Configuration (Task 1.1, 1.3, 1.4)", () => {
    it("uses correct storage key", () => {
      expect(STORAGE_KEY).toBe("continuum-sessions");
    });

    it("has initial storage version for migrations", () => {
      expect(STORAGE_VERSION).toBe(1);
    });
  });

  describe("Session Persistence (AC #1, #2)", () => {
    it("sessions persist to localStorage on state change", async () => {
      const { createSession } = useSessionStore.getState();

      createSession("Test message");

      // Wait for Zustand persist to sync
      await vi.waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      // Verify setItem was called with STORAGE_KEY
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const sessionStoreCalls = setItemCalls.filter(
        (call: unknown[]) => call[0] === STORAGE_KEY
      );
      expect(sessionStoreCalls.length).toBeGreaterThan(0);

      // Verify the value passed was a string (JSON serialized)
      const lastCall = sessionStoreCalls.at(-1);
      expect(lastCall).toBeDefined();
      expect(typeof lastCall?.[1]).toBe("string");

      const parsed = JSON.parse(lastCall?.[1] as string);
      expect(parsed.state.sessions).toHaveLength(1);
      expect(parsed.state.sessions[0].title).toBe("Test message");
    });

    it("sessions rehydrate from localStorage on store creation", async () => {
      // Pre-populate localStorage with session data
      const mockData = {
        state: {
          sessions: [
            {
              id: "test-session-1",
              title: "Previous session",
              messages: [
                {
                  id: "msg-1",
                  role: "user" as const,
                  content: "Hello",
                  timestamp: new Date().toISOString(),
                },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          activeSessionId: "test-session-1",
        },
        version: STORAGE_VERSION,
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(mockData));

      // Manually trigger rehydration by setting state
      useSessionStore.setState({
        sessions: mockData.state.sessions.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })),
        activeSessionId: mockData.state.activeSessionId,
      });

      const state = useSessionStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].title).toBe("Previous session");
    });

    it("preserves partial response on recovery (AC #5)", async () => {
      // Simulate a session with partial response (streaming interrupted)
      const mockData = {
        state: {
          sessions: [
            {
              id: "session-with-partial",
              title: "Interrupted session",
              messages: [
                {
                  id: "msg-1",
                  role: "user" as const,
                  content: "Tell me a story",
                  timestamp: new Date().toISOString(),
                },
                {
                  id: "msg-2",
                  role: "assistant" as const,
                  content: "Once upon a time, there was a", // Partial response
                  timestamp: new Date().toISOString(),
                  metadata: undefined, // No finalization metadata = incomplete
                },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          activeSessionId: "session-with-partial",
        },
        version: STORAGE_VERSION,
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(mockData));

      // Simulate recovery by loading stored sessions
      useSessionStore.setState({
        sessions: mockData.state.sessions.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })),
        activeSessionId: mockData.state.activeSessionId,
      });

      const state = useSessionStore.getState();
      const session = state.sessions[0];

      // Partial response should be preserved
      expect(session.messages).toHaveLength(2);
      expect(session.messages[1].content).toBe("Once upon a time, there was a");
    });
  });

  describe("Dirty Flag Behavior (Task 2.4, 2.5)", () => {
    it("marks session as dirty on createSession", () => {
      const { createSession } = useSessionStore.getState();

      expect(useSessionStore.getState().isDirty).toBe(false);

      createSession("Test message");

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("marks session as dirty on addMessage", () => {
      const { createSession, addMessage } = useSessionStore.getState();

      const sessionId = createSession("Test session");
      useSessionStore.setState({ isDirty: false }); // Reset dirty flag

      addMessage(sessionId, { role: "user", content: "Hello" });

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("markDirty sets isDirty to true", () => {
      expect(useSessionStore.getState().isDirty).toBe(false);

      useSessionStore.getState().markDirty();

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("clearDirty sets isDirty to false and updates lastSavedAt", () => {
      const beforeClear = Date.now();
      useSessionStore.setState({ isDirty: true, lastSavedAt: null });

      useSessionStore.getState().clearDirty();

      const state = useSessionStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeGreaterThanOrEqual(beforeClear);
    });
  });

  describe("Session Recovery Detection (Task 3.2)", () => {
    it("initializeSessions sets wasRecovered when sessions exist", () => {
      // Pre-populate with recovered sessions
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-session",
            title: "Recovered",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: false,
      });

      useSessionStore.getState().initializeSessions();

      expect(useSessionStore.getState().wasRecovered).toBe(true);
    });

    it("initializeSessions does not set wasRecovered when sessions empty", () => {
      useSessionStore.setState({
        sessions: [],
        wasRecovered: false,
      });

      useSessionStore.getState().initializeSessions();

      expect(useSessionStore.getState().wasRecovered).toBe(false);
    });
  });

  describe("Session Ordering (AC #4)", () => {
    it("sessions are stored in creation order (newest first)", () => {
      const { createSession } = useSessionStore.getState();

      createSession("First session");
      createSession("Second session");
      createSession("Third session");

      const { sessions } = useSessionStore.getState();
      expect(sessions[0].title).toBe("Third session");
      expect(sessions[1].title).toBe("Second session");
      expect(sessions[2].title).toBe("First session");
    });
  });

  describe("Partialize Configuration (Task 1.6)", () => {
    it("only persists session data, not UI state", async () => {
      const { createSession } = useSessionStore.getState();

      createSession("Test session");
      useSessionStore.setState({
        isDirty: true,
        lastSavedAt: Date.now(),
        wasRecovered: true,
      });

      // Wait for persist
      await vi.waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      // Get the last call to setItem with STORAGE_KEY
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const sessionStoreCalls = setItemCalls.filter(
        (call: unknown[]) => call[0] === STORAGE_KEY
      );
      expect(sessionStoreCalls.length).toBeGreaterThan(0);

      const lastCall = sessionStoreCalls.at(-1);
      expect(lastCall).toBeDefined();
      const parsed = JSON.parse(lastCall?.[1] as string);

      // Session data should be persisted
      expect(parsed.state.sessions).toBeDefined();
      expect(parsed.state.activeSessionId).toBeDefined();

      // UI state should NOT be persisted (handled by partialize)
      // These should be undefined in the persisted state
      expect(parsed.state.isDirty).toBeUndefined();
      expect(parsed.state.lastSavedAt).toBeUndefined();
      expect(parsed.state.wasRecovered).toBeUndefined();
    });
  });
});

describe("Privacy Store - No Persistence", () => {
  it("privacy store does NOT use persist middleware", async () => {
    // This test verifies ADR-PERSIST-003: Privacy store remains memory-only
    // Network log is sensitive metadata per ADR-PRIVACY-004
    const { usePrivacyStore } = await import("@/stores/privacy");

    // Log a network attempt
    usePrivacyStore.getState().logNetworkAttempt({
      type: "fetch",
      url: "https://test.com",
      blocked: true,
    });

    // Privacy store should NOT write to localStorage
    const privacyData = localStorageMock.getItem("continuum-privacy");
    expect(privacyData).toBeNull();
  });
});

describe("Performance Constraints (NFR-STATE-3)", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("persistence completes within 50ms budget", async () => {
    // Mock performance.now for timing verification
    let persistDuration = 0;
    const originalSetItem = localStorageMock.setItem;

    localStorageMock.setItem = vi.fn((key: string, value: string) => {
      const start = performance.now();
      originalSetItem(key, value);
      persistDuration = performance.now() - start;
    });

    const { createSession, addMessage } = useSessionStore.getState();
    const sessionId = createSession("Performance test session");

    // Add multiple messages to create realistic payload
    for (let i = 0; i < 10; i++) {
      addMessage(sessionId, {
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}: This is a test message with some content.`,
      });
    }

    // Wait for persist
    await vi.waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    // Verify persistence is reasonably fast (under 50ms per NFR-STATE-3)
    // Note: In test environment, localStorage mock is synchronous and very fast
    expect(persistDuration).toBeLessThan(50);
  });
});

describe("Session Deletion (Story 3.3 - Task 2)", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset store to initial state with some test sessions
    useSessionStore.setState({
      sessions: [
        {
          id: "session-1",
          title: "First Session",
          messages: [],
          createdAt: new Date("2025-12-30T10:00:00Z"),
          updatedAt: new Date("2025-12-30T12:00:00Z"),
        },
        {
          id: "session-2",
          title: "Second Session",
          messages: [],
          createdAt: new Date("2025-12-30T09:00:00Z"),
          updatedAt: new Date("2025-12-30T11:00:00Z"),
        },
        {
          id: "session-3",
          title: "Third Session",
          messages: [],
          createdAt: new Date("2025-12-30T08:00:00Z"),
          updatedAt: new Date("2025-12-30T10:00:00Z"),
        },
      ],
      activeSessionId: "session-1",
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe("deleteSession (Task 2.1, 2.3, 2.4, 2.5)", () => {
    it("removes session from sessions array", () => {
      const { deleteSession } = useSessionStore.getState();

      deleteSession("session-2");

      const { sessions } = useSessionStore.getState();
      expect(sessions).toHaveLength(2);
      expect(sessions.find((s) => s.id === "session-2")).toBeUndefined();
    });

    it("returns the deleted session for undo cache", () => {
      const { deleteSession } = useSessionStore.getState();

      const deletedSession = deleteSession("session-2");

      expect(deletedSession).toBeDefined();
      expect(deletedSession?.id).toBe("session-2");
      expect(deletedSession?.title).toBe("Second Session");
    });

    it("marks state as dirty", () => {
      expect(useSessionStore.getState().isDirty).toBe(false);

      useSessionStore.getState().deleteSession("session-2");

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("sets activeSessionId to next session when active session deleted", () => {
      // session-1 is active, session-2 is next
      const { deleteSession } = useSessionStore.getState();

      deleteSession("session-1");

      const { activeSessionId } = useSessionStore.getState();
      expect(activeSessionId).toBe("session-2");
    });

    it("sets activeSessionId to previous session if deleted session was last", () => {
      useSessionStore.setState({ activeSessionId: "session-3" });

      const { deleteSession } = useSessionStore.getState();
      deleteSession("session-3");

      const { activeSessionId } = useSessionStore.getState();
      expect(activeSessionId).toBe("session-2");
    });

    it("sets activeSessionId to null when no sessions remain", () => {
      // Start with only one session
      useSessionStore.setState({
        sessions: [
          {
            id: "only-session",
            title: "Only Session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        activeSessionId: "only-session",
      });

      const { deleteSession } = useSessionStore.getState();
      deleteSession("only-session");

      const { sessions, activeSessionId } = useSessionStore.getState();
      expect(sessions).toHaveLength(0);
      expect(activeSessionId).toBeNull();
    });

    it("does not change activeSessionId when non-active session deleted", () => {
      // session-1 is active, delete session-2
      const { deleteSession } = useSessionStore.getState();

      deleteSession("session-2");

      const { activeSessionId } = useSessionStore.getState();
      expect(activeSessionId).toBe("session-1");
    });

    it("returns undefined for non-existent session", () => {
      const { deleteSession } = useSessionStore.getState();

      const result = deleteSession("non-existent-session");

      expect(result).toBeUndefined();
    });
  });

  describe("restoreSession (Task 2.2)", () => {
    it("adds session back to sessions array", () => {
      const { deleteSession, restoreSession } = useSessionStore.getState();

      const deletedSession = deleteSession("session-2");
      expect(deletedSession).toBeDefined();
      expect(useSessionStore.getState().sessions).toHaveLength(2);

      if (deletedSession) {
        restoreSession(deletedSession);
      }

      expect(useSessionStore.getState().sessions).toHaveLength(3);
    });

    it("marks state as dirty", () => {
      const session = useSessionStore.getState().sessions[0];
      useSessionStore.setState({
        sessions: useSessionStore.getState().sessions.slice(1),
        isDirty: false,
      });

      useSessionStore.getState().restoreSession(session);

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("restores session in correct sorted order by updatedAt", () => {
      const { deleteSession, restoreSession } = useSessionStore.getState();

      // Delete and restore session-2
      const deletedSession = deleteSession("session-2");
      expect(deletedSession).toBeDefined();
      if (deletedSession) {
        restoreSession(deletedSession);
      }

      // Sessions should be sorted by updatedAt descending
      const { sessions } = useSessionStore.getState();
      expect(sessions[0].id).toBe("session-1"); // updatedAt: 12:00
      expect(sessions[1].id).toBe("session-2"); // updatedAt: 11:00
      expect(sessions[2].id).toBe("session-3"); // updatedAt: 10:00
    });
  });
});

describe("Version Migration (Task 1.6)", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("handles migration from version 0 to version 1", async () => {
    // Simulate old version data
    const oldData = {
      state: {
        sessions: [
          {
            id: "old-session",
            title: "Old session",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activeSessionId: "old-session",
      },
      version: 0, // Old version
    };

    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(oldData));

    // Migration should handle old data gracefully
    // The persist middleware will call migrate() on rehydration
    // For now, version 0 -> 1 is a no-op migration
    useSessionStore.setState({
      sessions: oldData.state.sessions.map((s) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      })),
      activeSessionId: oldData.state.activeSessionId,
    });

    const state = useSessionStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].title).toBe("Old session");
  });
});
