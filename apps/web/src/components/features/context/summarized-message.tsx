"use client";

/**
 * SummarizedMessage Component
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 4: Display component for summarized messages.
 *
 * Shows summary content with visual distinction (blue background),
 * token savings info, and expandable original messages.
 *
 * AC #3: Visual distinction for summaries
 * AC #4: Show original on expansion with smooth animation
 *
 * Task 4.4: Uses Base UI Collapsible primitive (NOT Radix)
 * Task 4.5: Animates with animate-accordion-down/animate-accordion-up
 */
import { Collapsible } from "@base-ui/react/collapsible";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Message } from "@/stores/session";

/**
 * Props for SummarizedMessage
 */
export interface SummarizedMessageProps {
  /** The summary content text */
  summaryContent: string;
  /** Number of messages that were summarized */
  messageCount: number;
  /** Original token count before summarization */
  originalTokenCount: number;
  /** Token count after summarization */
  summarizedTokenCount: number;
  /** When the summarization occurred */
  summarizedAt: Date;
  /** Whether original messages are expanded */
  isExpanded: boolean;
  /** Callback to toggle expansion */
  onToggle: () => void;
  /** Original messages to show when expanded */
  originalMessages: Message[];
}

/**
 * SummarizedMessage
 *
 * Displays a summarized message with visual distinction and
 * expandable view of original messages using Base UI Collapsible.
 */
export function SummarizedMessage({
  summaryContent,
  messageCount,
  originalTokenCount,
  summarizedTokenCount,
  isExpanded,
  onToggle,
  originalMessages,
}: SummarizedMessageProps) {
  // Calculate token savings percentage
  const savedTokens = originalTokenCount - summarizedTokenCount;
  const savedPercentage = Math.round((savedTokens / originalTokenCount) * 100);

  return (
    <div
      className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
      data-slot="summarized-message"
      data-testid="summarized-message"
    >
      {/* Summary header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-blue-800 text-sm dark:text-blue-200">
          Summarized {messageCount} messages
        </span>
        <span className="text-blue-600 text-xs dark:text-blue-400">
          Saved {savedPercentage}% ({savedTokens} tokens)
        </span>
      </div>

      {/* Summary content */}
      <p className="mb-3 text-gray-700 text-sm dark:text-gray-300">
        {summaryContent}
      </p>

      {/* Base UI Collapsible for original messages (Task 4.4) */}
      <Collapsible.Root onOpenChange={onToggle} open={isExpanded}>
        <Collapsible.Trigger
          className="flex items-center gap-1.5 text-blue-600 text-sm hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          type="button"
        >
          <HugeiconsIcon
            className="h-4 w-4 transition-transform duration-200"
            icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
          />
          {isExpanded ? "Hide original" : "Show original"}
        </Collapsible.Trigger>

        {/* Animated panel (Task 4.5) */}
        <Collapsible.Panel className="mt-3 overflow-hidden border-blue-200 border-t pt-3 data-[ending-style]:animate-accordion-up data-[starting-style]:animate-accordion-down dark:border-blue-800">
          {originalMessages.length > 0 && (
            <div className="space-y-2">
              {originalMessages.map((message) => (
                <div
                  className="rounded bg-white/50 p-2 text-sm dark:bg-black/20"
                  key={message.id}
                >
                  <span className="font-medium text-gray-500 text-xs dark:text-gray-400">
                    {message.role}:
                  </span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}
