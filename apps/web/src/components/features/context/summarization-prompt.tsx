"use client";

/**
 * SummarizationPrompt Component
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 3: Inline prompt for triggering summarization.
 *
 * Shows when context health reaches critical threshold.
 * Explains what summarization will do and offers action buttons.
 *
 * AC #1: When context usage reaches critical threshold, show inline prompt
 */
import { ArrowShrinkIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useContextHealth } from "@/hooks/use-context-health";

/**
 * Props for SummarizationPrompt
 */
export interface SummarizationPromptProps {
  /** Number of messages that will be summarized */
  messagesCount: number;
  /** Callback when user clicks Summarize button */
  onSummarize: () => void;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
}

/**
 * SummarizationPrompt
 *
 * Inline prompt shown when context reaches critical threshold.
 * Amber/orange color theme to differentiate from critical alert (red).
 */
export function SummarizationPrompt({
  messagesCount,
  onSummarize,
  onDismiss,
}: SummarizationPromptProps) {
  const { health } = useContextHealth();

  // Only show when context is critical
  if (!health || health.status !== "critical") {
    return null;
  }

  // Calculate approximate messages to summarize (50% of oldest)
  const toSummarize = Math.floor(messagesCount / 2);

  return (
    <div
      aria-label="Summarization prompt"
      className="flex items-center justify-between gap-4 border-t bg-amber-50 px-4 py-3 dark:bg-amber-950/20"
      data-slot="summarization-prompt"
      data-testid="summarization-prompt"
      role="region"
    >
      <div className="flex items-center gap-3">
        <HugeiconsIcon
          className="h-5 w-5 text-amber-600 dark:text-amber-400"
          icon={ArrowShrinkIcon}
        />
        <div className="flex flex-col">
          <span className="font-medium text-amber-800 text-sm dark:text-amber-200">
            Context is running low
          </span>
          <span className="text-amber-700 text-xs dark:text-amber-300">
            Summarize {toSummarize} older messages to free up space. Original
            messages will be preserved.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-amber-700"
          onClick={onSummarize}
          type="button"
        >
          Summarize
        </button>
        <button
          aria-label="Dismiss summarization prompt"
          className="rounded-md p-1.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/50"
          onClick={onDismiss}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={Cancel01Icon} />
        </button>
      </div>
    </div>
  );
}
