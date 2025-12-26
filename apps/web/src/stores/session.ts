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

/**
 * Message in a chat session.
 * Role: 'user' for human messages, 'assistant' for AI responses.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  /** Add a message to a session */
  addMessage: (
    sessionId: string,
    message: Omit<Message, "id" | "timestamp">
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

  addMessage: (sessionId, { role, content }) => {
    const message: Message = {
      id: crypto.randomUUID(),
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
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  getActiveSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.activeSessionId);
  },
}));
