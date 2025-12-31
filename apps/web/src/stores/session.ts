/**
 * Session Store
 *
 * Zustand store for managing chat sessions and messages.
 * Uses persist middleware for crash-resistant session recovery.
 *
 * PERSISTENCE BOUNDARY (ADR-PERSIST-003):
 * - Sessions persist to localStorage in ALL privacy modes
 * - Privacy store remains memory-only (never persisted)
 * - Jazz CRDT sync deferred to Epic 6 for collaborative features
 *
 * Story 1.3: Basic Chat UI Shell
 * Story 1.7: Session Persistence & Auto-Save
 * ADR-CHAT-001: Zustand for Session State
 * ADR-PERSIST-001: Zustand Persist Middleware for Sessions
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InferenceMetadata } from "@/types/inference";
import {
  createStorageAdapter,
  partializeSessionState,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "./persist";

// Re-export types for consumers that import from session store
export type { InferenceMetadata, InferenceSource } from "@/types/inference";

/**
 * Module-level storage for original messages (Story 3.5)
 * Maps summary message ID -> array of original messages that were summarized.
 * Memory-only: does not persist across page reloads.
 * For persistence, consider storing in session.originalMessages field.
 */
const originalMessagesStore = new Map<string, Message[]>();

/**
 * Metadata for summarized messages (Story 3.5 Task 1.1, 1.2)
 * Tracks original messages that were condensed into a summary.
 */
export interface SummarizationMetadata {
  /** This message is a summary */
  isSummary: true;
  /** IDs of original messages that were summarized */
  originalMessageIds: string[];
  /** When summarization occurred */
  summarizedAt: Date;
  /** Number of messages summarized */
  messageCount: number;
  /** Token count before summarization */
  originalTokenCount: number;
  /** Token count after summarization */
  summarizedTokenCount: number;
}

/** Metadata for finalized messages (Story 1.4 Task 8.3, extended in 1.5, 2.4, 3.5) */
export interface MessageMetadata {
  tokensGenerated?: number;
  finishReason?: "completed" | "aborted" | "error";
  durationMs?: number;
  /** Inference metadata (Story 1.5) */
  inference?: InferenceMetadata;
  /** Model ID that generated this message (Story 2.4 Task 8.1) */
  modelId?: string;
  /** Summarization metadata (Story 3.5 Task 1.1) */
  summarization?: SummarizationMetadata;
}

/**
 * Message in a chat session.
 * Role: 'user' for human messages, 'assistant' for AI responses.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Metadata populated after generation completes (assistant messages only) */
  metadata?: MessageMetadata;
}

/**
 * Chat session containing messages.
 * Title is generated from first message (max 50 chars).
 */
export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session store state interface.
 * Story 1.7 additions: lastSavedAt, isDirty, wasRecovered, markDirty, clearDirty, initializeSessions
 */
export interface SessionState {
  /** All sessions, newest first */
  sessions: Session[];
  /** Currently active session ID */
  activeSessionId: string | null;
  /** Timestamp of last successful persist (Story 1.7) */
  lastSavedAt: number | null;
  /** Flag indicating dirty state - unsaved changes (Story 1.7) */
  isDirty: boolean;
  /** Recovery flag set if sessions loaded from storage (Story 1.7) */
  wasRecovered: boolean;
  /** Create a new session with title from first message */
  createSession: (firstMessage: string) => string;
  /** Add a message to a session. Optionally provide id for streaming placeholder. */
  addMessage: (
    sessionId: string,
    message: Omit<Message, "id" | "timestamp"> & { id?: string }
  ) => string;
  /** Update message content incrementally (for streaming) */
  updateMessageContent: (
    sessionId: string,
    messageId: string,
    content: string
  ) => void;
  /** Set inference metadata on a message (Story 1.5 Task 5.1) */
  setMessageInferenceMetadata: (
    sessionId: string,
    messageId: string,
    inferenceMetadata: InferenceMetadata
  ) => void;
  /** Finalize message with metadata after generation completes */
  finalizeMessage: (
    sessionId: string,
    messageId: string,
    metadata?: MessageMetadata
  ) => void;
  /** Set the active session */
  setActiveSession: (sessionId: string | null) => void;
  /** Get the currently active session */
  getActiveSession: () => Session | undefined;
  /** Initialize sessions from storage - called on mount (Story 1.7) */
  initializeSessions: () => void;
  /** Mark state as dirty - called on any change (Story 1.7) */
  markDirty: () => void;
  /** Clear dirty flag - called after persist (Story 1.7) */
  clearDirty: () => void;
  /** Delete a session by ID (Story 3.3 Task 2.1) */
  deleteSession: (sessionId: string) => Session | undefined;
  /** Restore a previously deleted session for undo (Story 3.3 Task 2.2) */
  restoreSession: (session: Session) => void;
  /** Store original messages and create summary message (Story 3.5 Task 1.3) */
  storeSummarizedMessages: (
    sessionId: string,
    summaryContent: string,
    originalMessages: Message[],
    metadata: Omit<SummarizationMetadata, "isSummary">
  ) => string;
  /** Retrieve original messages for a summary (Story 3.5 Task 1.4) */
  getOriginalMessages: (
    sessionId: string,
    summaryMessageId: string
  ) => Message[];
  /** Memory-only set of expanded summary IDs (Story 3.5) */
  expandedSummaries: Set<string>;
  /** Toggle expansion state for a summary (Story 3.5) */
  toggleSummaryExpansion: (messageId: string) => void;
}

/**
 * Session store using Zustand with persist middleware.
 * Persistence via localStorage per ADR-PERSIST-001.
 *
 * Story 1.7: Added persist middleware, auto-save support, recovery detection.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,

      createSession: (firstMessage) => {
        const id = crypto.randomUUID();
        const title =
          firstMessage.length > 50
            ? `${firstMessage.slice(0, 50)}...`
            : firstMessage;

        const session: Session = {
          id,
          title,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
          isDirty: true, // Mark dirty on change (Story 1.7)
        }));

        return id;
      },

      addMessage: (sessionId, { role, content, id }) => {
        const messageId = id ?? crypto.randomUUID();
        const message: Message = {
          id: messageId,
          role,
          content,
          timestamp: new Date(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  updatedAt: new Date(),
                }
              : s
          ),
          isDirty: true, // Mark dirty on change (Story 1.7)
        }));

        return messageId;
      },

      updateMessageContent: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, content } : m
                  ),
                  updatedAt: new Date(),
                }
              : s
          ),
          isDirty: true, // Mark dirty on change (Story 1.7)
        }));
      },

      setMessageInferenceMetadata: (
        sessionId,
        messageId,
        inferenceMetadata
      ) => {
        // Story 1.5 Task 5.1: Track inference metadata per message
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          metadata: {
                            ...m.metadata,
                            inference: inferenceMetadata,
                          },
                        }
                      : m
                  ),
                  updatedAt: new Date(),
                }
              : s
          ),
          isDirty: true, // Mark dirty on change (Story 1.7)
        }));
      },

      finalizeMessage: (sessionId, messageId, metadata) => {
        // Store metadata with the message (Story 1.4 Task 8.3)
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, timestamp: new Date(), metadata }
                      : m
                  ),
                  updatedAt: new Date(),
                }
              : s
          ),
          isDirty: true, // Mark dirty on change (Story 1.7)
        }));
      },

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      getActiveSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.activeSessionId);
      },

      // Story 1.7 Task 3.1: Initialize sessions from storage
      initializeSessions: () => {
        const state = get();
        if (state.sessions.length > 0) {
          set({ wasRecovered: true });
        }
      },

      // Story 1.7 Task 2.4: Mark state as dirty
      markDirty: () => set({ isDirty: true }),

      // Story 1.7 Task 2.5: Clear dirty flag after persist
      clearDirty: () =>
        set({
          isDirty: false,
          lastSavedAt: Date.now(),
        }),

      // Story 3.3 Task 2.1: Delete a session by ID
      deleteSession: (sessionId) => {
        const state = get();
        const session = state.sessions.find((s) => s.id === sessionId);

        if (!session) {
          return undefined;
        }

        // Task 2.4: Determine next active session if deleting active
        const sessionIndex = state.sessions.findIndex(
          (s) => s.id === sessionId
        );
        const nextSession =
          state.sessions[sessionIndex + 1] ?? state.sessions[sessionIndex - 1];
        const nextActiveId =
          state.activeSessionId === sessionId
            ? (nextSession?.id ?? null)
            : state.activeSessionId;

        // Task 2.3: Remove from sessions array and mark dirty
        set({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId: nextActiveId,
          isDirty: true,
        });

        // Task 2.5: Return deleted session for undo cache
        return session;
      },

      // Story 3.3 Task 2.2: Restore a previously deleted session
      restoreSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          ),
          isDirty: true,
        }));
      },

      // Story 3.5 Task 1.3: Store original messages and create summary message
      storeSummarizedMessages: (
        sessionId,
        summaryContent,
        originalMessages,
        metadata
      ) => {
        const state = get();
        const session = state.sessions.find((s) => s.id === sessionId);

        if (!session) {
          return "";
        }

        const summaryId = crypto.randomUUID();
        const originalIds = originalMessages.map((m) => m.id);

        // Create summary message with metadata
        const summaryMessage: Message = {
          id: summaryId,
          role: "assistant" as const,
          content: summaryContent,
          timestamp: new Date(),
          metadata: {
            summarization: {
              isSummary: true,
              ...metadata,
            },
          },
        };

        // Store original messages in module-level map
        originalMessagesStore.set(summaryId, originalMessages);

        // Replace original messages with summary in session
        const filteredMessages = session.messages.filter(
          (m) => !originalIds.includes(m.id)
        );

        // Insert summary at the position of first summarized message
        const insertIndex = session.messages.findIndex((m) =>
          originalIds.includes(m.id)
        );
        const newMessages = [
          ...filteredMessages.slice(0, insertIndex),
          summaryMessage,
          ...filteredMessages.slice(insertIndex),
        ];

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: newMessages,
                  updatedAt: new Date(),
                }
              : s
          ),
          isDirty: true,
        }));

        return summaryId;
      },

      // Story 3.5 Task 1.4: Retrieve original messages for a summary
      getOriginalMessages: (_sessionId, summaryMessageId) => {
        return originalMessagesStore.get(summaryMessageId) ?? [];
      },

      // Story 3.5: Memory-only expansion state
      expandedSummaries: new Set<string>(),

      // Story 3.5: Toggle expansion state
      toggleSummaryExpansion: (messageId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedSummaries);
          if (newExpanded.has(messageId)) {
            newExpanded.delete(messageId);
          } else {
            newExpanded.add(messageId);
          }
          return { expandedSummaries: newExpanded };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createStorageAdapter(),
      partialize: partializeSessionState,
      // Date deserialization handled by createStorageAdapter() with dateReviver
    }
  )
);
