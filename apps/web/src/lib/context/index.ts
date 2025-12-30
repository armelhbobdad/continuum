/**
 * Context Library Exports
 *
 * Story 3.4: Context Health Indicators
 * Task 8.3 & 8.4: Barrel exports for context utilities.
 */

// Context health calculation
export {
  CONTEXT_THRESHOLDS,
  type ContextHealth,
  type ContextHealthStatus,
  calculateContextHealth,
} from "./context-health";
// Token counting
export {
  type ContextMetrics,
  countSessionTokens,
  estimateTokens,
} from "./count-tokens";
