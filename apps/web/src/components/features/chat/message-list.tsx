"use client";

/**
 * Message List Component
 *
 * Displays messages from the active session.
 * Composes individual Message components.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #4 (message display)
 *
 * TODO: Implement virtual scrolling for performance with large message lists.
 * Consider using @tanstack/react-virtual or similar library when message
 * counts exceed ~100 messages. Current implementation uses native scrolling
 * which is sufficient for typical session sizes.
 * Reference: Story 1.3 Task 5.7 - Virtual scrolling placeholder
 */

import type { Message as MessageType } from "@/stores/session";
import { Message } from "./message";

interface MessageListProps {
  messages: MessageType[];
}

/**
 * Message List Component
 *
 * Displays list of messages with user/assistant positioning.
 * Uses role="log" for accessibility.
 */
export function MessageList({ messages }: MessageListProps) {
  // TODO: Consider virtual scrolling when messages.length > 100
  return (
    <div
      aria-live="polite"
      className="flex-1 space-y-4 overflow-y-auto p-4"
      data-slot="message-list"
      data-testid="message-list"
      role="log"
    >
      {messages.map((message) => (
        <div
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          key={message.id}
        >
          <Message
            content={message.content}
            role={message.role}
            timestamp={message.timestamp}
          />
        </div>
      ))}
    </div>
  );
}
