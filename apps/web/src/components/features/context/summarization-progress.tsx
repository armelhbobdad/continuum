"use client";

/**
 * SummarizationProgress Component
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 7: Progress UI during summarization.
 *
 * Shows inline progress bar, streaming text, and cancel button.
 *
 * AC #2: Streaming progress shown during summarization
 */
import { Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Props for SummarizationProgress
 */
export interface SummarizationProgressProps {
  /** Whether summarization is in progress */
  isSummarizing: boolean;
  /** Number of messages being summarized */
  messageCount: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current streaming text output */
  streamingText: string;
  /** Callback when user cancels summarization */
  onCancel: () => void;
}

/**
 * SummarizationProgress
 *
 * Inline progress indicator shown during active summarization.
 * Displays progress bar, status message, streaming text preview,
 * and cancel button.
 */
export function SummarizationProgress({
  isSummarizing,
  messageCount,
  progress,
  streamingText,
  onCancel,
}: SummarizationProgressProps) {
  // Only show when summarizing
  if (!isSummarizing) {
    return null;
  }

  return (
    <div
      className="border-t bg-blue-50 p-4 dark:bg-blue-950/20"
      data-slot="summarization-progress"
      data-testid="summarization-progress"
    >
      {/* Header with label and cancel button */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
            icon={Loading03Icon}
          />
          <span className="font-medium text-blue-800 text-sm dark:text-blue-200">
            Summarizing {messageCount} messages...
          </span>
        </div>
        <button
          aria-label="Cancel summarization"
          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950/50"
          onClick={onCancel}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={Cancel01Icon} />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      {/* Progress bar */}
      <div
        aria-label="Summarization progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800"
        role="progressbar"
      >
        <div
          className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Streaming text preview */}
      {streamingText && (
        <div className="rounded-md bg-white/50 p-2 text-gray-700 text-sm dark:bg-black/20 dark:text-gray-300">
          {streamingText}
        </div>
      )}
    </div>
  );
}
