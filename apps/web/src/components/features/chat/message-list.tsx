"use client";

/**
 * Message List Component
 *
 * Displays messages from the active session.
 * Composes individual Message and StreamingMessage components.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #4 (message display)
 *
 * Story 1.5: Inference Badge & Streaming UI
 * Task 4.2: Replace message rendering with StreamingMessage for AI responses
 * Task 4.4: Ensure badge persists on message after completion
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 6.3: Render SummarizedMessage for messages with summarization metadata
 *
 * TODO: Implement virtual scrolling for performance with large message lists.
 * Consider using @tanstack/react-virtual or similar library when message
 * counts exceed ~100 messages. Current implementation uses native scrolling
 * which is sufficient for typical session sizes.
 * Reference: Story 1.3 Task 5.7 - Virtual scrolling placeholder
 */

import type { Message as MessageType } from "@/stores/session";
import { useSessionStore } from "@/stores/session";
import type { StreamingMetadata } from "@/types/inference";
import { SummarizedMessage } from "../context";
import { Message } from "./message";
import { StreamingMessage } from "./streaming-message";

interface MessageListProps {
  messages: MessageType[];
  /** Current streaming metadata for in-progress generation (Story 1.5) */
  streamingMetadata?: StreamingMetadata | null;
}

/**
 * Message List Component
 *
 * Displays list of messages with user/assistant positioning.
 * Uses role="log" for accessibility.
 * Renders StreamingMessage for AI responses with inference badge (Story 1.5).
 * Renders SummarizedMessage for condensed message groups (Story 3.5).
 */
export function MessageList({ messages, streamingMetadata }: MessageListProps) {
  // Story 3.5: Get expansion state and toggle function from session store
  const expandedSummaries = useSessionStore((s) => s.expandedSummaries);
  const toggleSummaryExpansion = useSessionStore(
    (s) => s.toggleSummaryExpansion
  );
  const getOriginalMessages = useSessionStore((s) => s.getOriginalMessages);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  // TODO: Consider virtual scrolling when messages.length > 100
  return (
    <div
      aria-live="polite"
      className="flex-1 space-y-4 overflow-y-auto p-4"
      data-slot="message-list"
      data-testid="message-list"
      role="log"
    >
      {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex message rendering logic */}
      {messages.map((message) => {
        // Story 3.5: Check for summarization metadata first
        const summarizationData = message.metadata?.summarization;
        if (summarizationData?.isSummary && activeSessionId) {
          const isExpanded = expandedSummaries.has(message.id);
          const originalMessages = getOriginalMessages(
            activeSessionId,
            message.id
          );

          return (
            <div className="flex justify-start" key={message.id}>
              <div className="max-w-[80%]">
                <SummarizedMessage
                  isExpanded={isExpanded}
                  messageCount={summarizationData.messageCount}
                  onToggle={() => toggleSummaryExpansion(message.id)}
                  originalMessages={originalMessages}
                  originalTokenCount={summarizationData.originalTokenCount}
                  summarizedAt={summarizationData.summarizedAt}
                  summarizedTokenCount={summarizationData.summarizedTokenCount}
                  summaryContent={message.content}
                />
              </div>
            </div>
          );
        }

        // For user messages, render regular Message
        if (message.role === "user") {
          return (
            <div className="flex justify-end" key={message.id}>
              <Message
                content={message.content}
                role={message.role}
                timestamp={message.timestamp}
              />
            </div>
          );
        }

        // For assistant messages, check if we should show StreamingMessage
        const isStreaming = streamingMetadata?.messageId === message.id;
        const inferenceData = message.metadata?.inference;

        // Show StreamingMessage if: currently streaming OR has inference metadata
        if (isStreaming || inferenceData) {
          const source = isStreaming
            ? streamingMetadata.source
            : (inferenceData?.source ?? "stub");
          const modelName = isStreaming
            ? streamingMetadata.modelName
            : (inferenceData?.modelName ?? "unknown");
          const startTime = isStreaming
            ? streamingMetadata.startTime
            : (inferenceData?.startTime ?? Date.now());
          const tokenCount = isStreaming
            ? streamingMetadata.tokenCount
            : (inferenceData?.tokenCount ?? 0);

          return (
            <div className="flex justify-start" key={message.id}>
              <div className="max-w-[80%]">
                <StreamingMessage
                  content={message.content}
                  inferenceSource={source}
                  isStreaming={isStreaming}
                  modelName={modelName}
                  startTime={startTime}
                  tokenCount={tokenCount}
                />
              </div>
            </div>
          );
        }

        // Fallback: render regular Message for assistant messages without inference metadata
        return (
          <div className="flex justify-start" key={message.id}>
            <Message
              content={message.content}
              role={message.role}
              timestamp={message.timestamp}
            />
          </div>
        );
      })}
    </div>
  );
}
