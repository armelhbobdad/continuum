/**
 * Session Store
 *
 * Zustand store for managing chat sessions and messages.
 * Memory-only storage - persistence handled in Story 1.7.
 *
 * Story 1.3: Basic Chat UI Shell
 * ADR-CHAT-001: Zustand for Session State
 * ADR-CHAT-002: Memory-Only Session Storage
 */
import { create } from "zustand";

/** Metadata for finalized messages (Story 1.4 Task 8.3) */
export interface MessageMetadata {
  tokensGenerated?: number;
  finishReason?: "completed" | "aborted" | "error";
  durationMs?: number;
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

interface SessionState {
  /** All sessions, newest first */
  sessions: Session[];
  /** Currently active session ID */
  activeSessionId: string | null;
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
}

/**
 * Session store using Zustand.
 * Memory-only storage (no persistence middleware) per ADR-CHAT-002.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

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
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      ),
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
    }));
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  getActiveSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.activeSessionId);
  },
}));
