/**
 * Shared Inference Types
 *
 * Canonical type definitions for inference-related data.
 * Used by session store, InferenceBadge, StreamingMessage, and ChatPanel.
 *
 * Story 1.5: Inference Badge & Streaming UI
 */

/** Source of inference - local, stub (web fallback), or cloud provider */
export type InferenceSource = "local" | "stub" | `cloud:${string}`;

/** Badge display state */
export type InferenceBadgeState =
  | "generating"
  | "complete"
  | "error"
  | "switching";

/**
 * Inference metadata tracked per message (Story 1.5 Task 5.2)
 * Persisted with messages for historical display.
 */
export type InferenceMetadata = {
  /** Source of inference: local, stub (web fallback), or cloud:provider */
  source: InferenceSource;
  /** Name of the model used */
  modelName: string;
  /** Timestamp when generation started (for duration calculation) */
  startTime: number;
  /** Number of tokens generated */
  tokenCount: number;
  /** Duration in milliseconds (populated on completion) */
  duration?: number;
};

/**
 * Streaming metadata for real-time UI updates during generation.
 * Passed from ChatPanel to MessageList to StreamingMessage.
 */
export type StreamingMetadata = {
  /** Message ID being streamed */
  messageId: string;
  /** Inference source */
  source: InferenceSource;
  /** Model name */
  modelName: string;
  /** Generation start timestamp */
  startTime: number;
  /** Current token count */
  tokenCount: number;
};
