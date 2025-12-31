/**
 * Token Counting Utility
 *
 * Story 3.4: Context Health Indicators
 * Task 1: Token counting for context health visualization.
 *
 * Token estimation: ~4 characters per token (GPT-like tokenization).
 * This is a fast approximation suitable for UI feedback.
 * For production accuracy, use tiktoken or model-specific tokenizer.
 *
 * NFR: Must complete within 10ms for 1000 messages
 */
import type { Session } from "@/stores/session";

/**
 * Token estimation ratio: ~4 characters per token.
 * This approximation works well for English text and code.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Metrics from token counting across a session.
 * Used by context health calculator to determine health status.
 */
export interface ContextMetrics {
  /** Total estimated tokens in context */
  totalTokens: number;
  /** Number of messages in session */
  messageCount: number;
  /** Tokens from user messages */
  userTokens: number;
  /** Tokens from assistant messages */
  assistantTokens: number;
}

/**
 * Estimate token count for text.
 * Uses character-based estimation (~4 chars = 1 token).
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count (always >= 0)
 */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Count tokens across all messages in a session.
 * Returns metrics for UI display.
 *
 * @param session - Session to count tokens for
 * @returns Context metrics with total, user, and assistant token counts
 */
export function countSessionTokens(session: Session): ContextMetrics {
  let userTokens = 0;
  let assistantTokens = 0;

  for (const message of session.messages) {
    const tokens = estimateTokens(message.content);
    if (message.role === "user") {
      userTokens += tokens;
    } else {
      assistantTokens += tokens;
    }
  }

  return {
    totalTokens: userTokens + assistantTokens,
    messageCount: session.messages.length,
    userTokens,
    assistantTokens,
  };
}
