"use client";

/**
 * StreamingMessage Component
 *
 * Displays streaming AI response with InferenceBadge and cursor animation.
 * Integrates with InferenceBadge to show real-time generation status.
 *
 * Story 1.5: Inference Badge & Streaming UI
 * AC2: Streaming Token Display
 * AC3: Completion State (badge shows timing after complete)
 *
 * ADR-UI-002: Badge Position Strategy - inline with response
 */

import { useEffect, useState } from "react";
import type { InferenceSource } from "../inference";
import { InferenceBadge } from "../inference";

export interface StreamingMessageProps {
  /** Current message content */
  content: string;
  /** Whether tokens are still being generated */
  isStreaming: boolean;
  /** Source of inference (local/stub/cloud:provider) */
  inferenceSource: InferenceSource;
  /** Name of the model being used */
  modelName: string;
  /** Timestamp when generation started */
  startTime: number;
  /** Number of tokens generated so far */
  tokenCount: number;
  /** Callback fired when streaming completes */
  onComplete?: () => void;
}

/**
 * StreamingMessage Component
 *
 * Shows AI response with real-time token streaming and InferenceBadge.
 * Cursor animation visible during generation.
 */
export function StreamingMessage({
  content,
  isStreaming,
  inferenceSource,
  modelName,
  startTime,
  tokenCount,
  onComplete,
}: StreamingMessageProps) {
  const [duration, setDuration] = useState<number | undefined>();

  // Calculate duration and call onComplete when streaming finishes
  useEffect(() => {
    if (!isStreaming && startTime) {
      setDuration(Date.now() - startTime);
      onComplete?.();
    }
  }, [isStreaming, startTime, onComplete]);

  return (
    <div className="space-y-2" data-slot="streaming-message">
      <InferenceBadge
        duration={duration}
        modelName={modelName}
        source={inferenceSource}
        state={isStreaming ? "generating" : "complete"}
        tokenCount={isStreaming ? undefined : tokenCount}
      />

      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        data-slot="message-content"
      >
        {content}
        {isStreaming && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-2 animate-blink bg-current"
            data-slot="streaming-cursor"
          />
        )}
      </div>
    </div>
  );
}
