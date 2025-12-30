/**
 * Context Health Calculator
 *
 * Story 3.4: Context Health Indicators
 * Task 2: Calculate context health based on token usage and model limits.
 *
 * Health statuses:
 * - healthy (<50%): Green - plenty of context remaining
 * - growing (50-79%): Yellow - context is filling up
 * - critical (>=80%): Red - near limit, suggest new session
 */
import type { ContextMetrics } from "./count-tokens";

/** Context health status levels */
export type ContextHealthStatus = "healthy" | "growing" | "critical";

/**
 * Threshold percentages for status changes.
 * These are fractions (0-1), not percentages (0-100).
 */
export const CONTEXT_THRESHOLDS = {
  /** Below 50% = healthy (green) */
  healthy: 0.5,
  /** 50-79% = growing (yellow) */
  growing: 0.8,
} as const;

/**
 * Calculated context health information.
 * Used by UI components to display context status.
 */
export interface ContextHealth {
  /** Current health status */
  status: ContextHealthStatus;
  /** Percentage of context used (0-100) */
  percentage: number;
  /** Tokens currently used */
  tokensUsed: number;
  /** Tokens remaining before limit */
  tokensRemaining: number;
  /** Number of messages in context */
  messageCount: number;
  /** Maximum context length for current model */
  maxContextLength: number;
}

/**
 * Calculate context health based on token usage and model limits.
 *
 * @param metrics - Token metrics from countSessionTokens
 * @param maxContextLength - Model's maximum context window
 * @returns ContextHealth with status, percentage, and token counts
 */
export function calculateContextHealth(
  metrics: ContextMetrics,
  maxContextLength: number
): ContextHealth {
  // Handle edge case of zero context length
  const percentage =
    maxContextLength > 0 ? (metrics.totalTokens / maxContextLength) * 100 : 0;

  // Determine status based on thresholds
  let status: ContextHealthStatus;
  if (percentage < CONTEXT_THRESHOLDS.healthy * 100) {
    status = "healthy";
  } else if (percentage < CONTEXT_THRESHOLDS.growing * 100) {
    status = "growing";
  } else {
    status = "critical";
  }

  return {
    status,
    percentage: Math.min(percentage, 100), // Cap at 100%
    tokensUsed: metrics.totalTokens,
    tokensRemaining: Math.max(0, maxContextLength - metrics.totalTokens),
    messageCount: metrics.messageCount,
    maxContextLength,
  };
}
