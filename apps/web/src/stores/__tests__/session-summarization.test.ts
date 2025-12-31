/**
 * Session Store Summarization Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 1: Extend Message Type for Summarization
 *
 * Tests for summarization metadata, store methods for storing
 * summarized messages, and retrieving original messages.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SummarizationMetadata } from "../session";
import { useSessionStore } from "../session";

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
  };
})();

describe("Session Store Summarization", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Store original localStorage
    originalLocalStorage = globalThis.localStorage;
    // Setup localStorage mock
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset store before each test
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

  describe("SummarizationMetadata type", () => {
    it("should have required fields for summarization metadata", () => {
      const metadata: SummarizationMetadata = {
        isSummary: true,
        originalMessageIds: ["msg-1", "msg-2"],
        summarizedAt: new Date(),
        messageCount: 2,
        originalTokenCount: 500,
        summarizedTokenCount: 100,
      };

      expect(metadata.isSummary).toBe(true);
      expect(metadata.originalMessageIds).toHaveLength(2);
      expect(metadata.messageCount).toBe(2);
      expect(metadata.originalTokenCount).toBe(500);
      expect(metadata.summarizedTokenCount).toBe(100);
    });
  });

  describe("storeSummarizedMessages", () => {
    it("should store summary message and hide original messages", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test conversation");

      // Add some messages to summarize
      const msg1Id = store.addMessage(sessionId, {
        role: "user" as const,
        content: "Hello, how are you?",
      });
      const msg2Id = store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "I am doing well, thank you!",
      });
      store.addMessage(sessionId, {
        role: "user" as const,
        content: "What is the weather like?",
      });
      store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "I cannot check the weather, but I hope it is nice!",
      });

      // Get messages before summarization
      const sessionBefore = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const messagesToSummarize = sessionBefore?.messages.slice(0, 2) ?? [];

      // Store summarized messages
      const summaryId = useSessionStore
        .getState()
        .storeSummarizedMessages(
          sessionId,
          "Summary: User greeted assistant who responded positively.",
          messagesToSummarize,
          {
            originalMessageIds: [msg1Id, msg2Id],
            summarizedAt: new Date(),
            messageCount: 2,
            originalTokenCount: 50,
            summarizedTokenCount: 15,
          }
        );

      expect(summaryId).toBeDefined();
      expect(typeof summaryId).toBe("string");

      // Session should have summary + remaining messages
      const sessionAfter = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      expect(sessionAfter?.messages).toHaveLength(3); // 1 summary + 2 remaining
    });

    it("should mark dirty after storing summarized messages", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test conversation");
      store.addMessage(sessionId, {
        role: "user" as const,
        content: "Hello",
      });
      store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "Hi there",
      });

      // Clear dirty flag
      useSessionStore.setState({ isDirty: false });

      const session = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const messagesToSummarize = session?.messages ?? [];

      useSessionStore
        .getState()
        .storeSummarizedMessages(sessionId, "Summary", messagesToSummarize, {
          originalMessageIds: messagesToSummarize.map((m) => m.id),
          summarizedAt: new Date(),
          messageCount: 2,
          originalTokenCount: 20,
          summarizedTokenCount: 5,
        });

      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it("should store original messages in map for later retrieval", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test conversation");

      const msg1Id = store.addMessage(sessionId, {
        role: "user" as const,
        content: "Message 1",
      });
      const msg2Id = store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "Message 2",
      });

      const session = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const messagesToSummarize = session?.messages ?? [];

      const summaryId = useSessionStore
        .getState()
        .storeSummarizedMessages(
          sessionId,
          "Summary text",
          messagesToSummarize,
          {
            originalMessageIds: [msg1Id, msg2Id],
            summarizedAt: new Date(),
            messageCount: 2,
            originalTokenCount: 20,
            summarizedTokenCount: 5,
          }
        );

      // Original messages should be retrievable
      const originals = useSessionStore
        .getState()
        .getOriginalMessages(sessionId, summaryId);
      expect(originals).toHaveLength(2);
      expect(originals[0].content).toBe("Message 1");
      expect(originals[1].content).toBe("Message 2");
    });

    it("should return empty array if session not found", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test");

      store.addMessage(sessionId, {
        role: "user" as const,
        content: "Test",
      });

      const result = store.storeSummarizedMessages(
        "non-existent-session",
        "Summary",
        [],
        {
          originalMessageIds: [],
          summarizedAt: new Date(),
          messageCount: 0,
          originalTokenCount: 0,
          summarizedTokenCount: 0,
        }
      );

      expect(result).toBe("");
    });
  });

  describe("getOriginalMessages", () => {
    it("should retrieve original messages for a summary", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test");

      const msg1Id = store.addMessage(sessionId, {
        role: "user" as const,
        content: "Original message 1",
      });
      const msg2Id = store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "Original message 2",
      });

      const session = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);

      const summaryId = useSessionStore
        .getState()
        .storeSummarizedMessages(
          sessionId,
          "Summary",
          session?.messages ?? [],
          {
            originalMessageIds: [msg1Id, msg2Id],
            summarizedAt: new Date(),
            messageCount: 2,
            originalTokenCount: 30,
            summarizedTokenCount: 5,
          }
        );

      const originals = useSessionStore
        .getState()
        .getOriginalMessages(sessionId, summaryId);

      expect(originals).toHaveLength(2);
      expect(originals[0].id).toBe(msg1Id);
      expect(originals[1].id).toBe(msg2Id);
    });

    it("should return empty array for non-existent summary", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test");

      const originals = store.getOriginalMessages(sessionId, "non-existent");

      expect(originals).toEqual([]);
    });

    it("should return empty array for non-existent session", () => {
      const originals = useSessionStore
        .getState()
        .getOriginalMessages("non-existent-session", "any-summary-id");

      expect(originals).toEqual([]);
    });
  });

  describe("toggleSummaryExpansion", () => {
    it("should toggle expansion state for a summary", () => {
      const store = useSessionStore.getState();

      // Initially not expanded
      expect(store.expandedSummaries.has("summary-1")).toBe(false);

      // Toggle on
      store.toggleSummaryExpansion("summary-1");
      expect(
        useSessionStore.getState().expandedSummaries.has("summary-1")
      ).toBe(true);

      // Toggle off
      useSessionStore.getState().toggleSummaryExpansion("summary-1");
      expect(
        useSessionStore.getState().expandedSummaries.has("summary-1")
      ).toBe(false);
    });
  });

  describe("Message with summarization metadata", () => {
    it("should correctly identify summary messages via metadata", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("Test");

      store.addMessage(sessionId, {
        role: "user" as const,
        content: "Hello",
      });
      store.addMessage(sessionId, {
        role: "assistant" as const,
        content: "Hi",
      });

      const session = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const sessionMessages = session?.messages ?? [];

      const summaryId = useSessionStore
        .getState()
        .storeSummarizedMessages(
          sessionId,
          "Summary of greeting",
          sessionMessages,
          {
            originalMessageIds: sessionMessages.map((m) => m.id),
            summarizedAt: new Date(),
            messageCount: 2,
            originalTokenCount: 10,
            summarizedTokenCount: 5,
          }
        );

      const updatedSession = useSessionStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const summaryMessage = updatedSession?.messages.find(
        (m) => m.id === summaryId
      );

      expect(summaryMessage).toBeDefined();
      expect(summaryMessage?.metadata?.summarization?.isSummary).toBe(true);
      expect(summaryMessage?.metadata?.summarization?.messageCount).toBe(2);
    });
  });
});
