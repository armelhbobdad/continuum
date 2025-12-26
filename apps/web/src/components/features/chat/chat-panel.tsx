"use client";

/**
 * Chat Panel Component
 *
 * Contains message list and input area.
 * Composes MessageList and MessageInput.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #1 (chat panel with message input)
 */

import { useCallback, useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/session";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

/**
 * Delay before showing stub AI response (in milliseconds).
 * Used for simulating AI response time in Story 1.3.
 * Will be replaced with actual inference in Story 1.4.
 */
const STUB_AI_RESPONSE_DELAY_MS = 500;

/**
 * Chat Panel Component
 *
 * Displays messages and input for the active session.
 * Handles scroll behavior and empty state.
 */
export function ChatPanel() {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const addMessage = useSessionStore((state) => state.addMessage);
  const createSession = useSessionStore((state) => state.createSession);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSendMessage = useCallback(
    (content: string) => {
      let sessionId = activeSessionId;

      // Auto-create session if none exists (AC #5)
      if (!sessionId) {
        sessionId = createSession(content);
      }

      // Add user message
      addMessage(sessionId, { role: "user", content });

      // Stub AI response (ADR-CHAT-004)
      setTimeout(() => {
        addMessage(sessionId, {
          role: "assistant",
          content: `Echo: ${content}`,
        });
      }, STUB_AI_RESPONSE_DELAY_MS);
    },
    [activeSessionId, addMessage, createSession]
  );

  return (
    <div
      className="flex h-full flex-col"
      data-slot="chat-panel"
      data-testid="chat-panel"
    >
      {/* Message area with scroll */}
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        {messages.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground"
            data-testid="empty-state"
          >
            <div className="mb-2 text-2xl">👋</div>
            <p className="font-medium text-lg">Start a new conversation</p>
            <p className="mt-1 text-sm">
              Type a message below to begin chatting
            </p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Input area */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
