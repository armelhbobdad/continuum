"use client";

/**
 * InferenceBadge Component
 *
 * Displays inference status (generating/complete/error) with mode-aware styling.
 * Core to Continuum's value proposition: "You always know where your words went."
 *
 * Story 1.5: Inference Badge & Streaming UI
 * AC1: Inference Badge Appearance
 * AC3: Completion State
 * AC4: Cloud Provider Badge
 * AC5: Screen Reader Accessibility
 *
 * ADR-UI-001: Badge remains visible on messages after completion
 * ADR-UI-003: Screen Reader Live Region
 */

import { cn } from "@/lib/utils";
import type { InferenceBadgeState, InferenceSource } from "@/types/inference";

// Re-export types for consumers
export type { InferenceBadgeState, InferenceSource } from "@/types/inference";

export interface InferenceBadgeProps {
  /** Current inference state */
  state: InferenceBadgeState;
  /** Source of inference (local/stub/cloud:provider) */
  source: InferenceSource;
  /** Name of the model being used */
  modelName: string;
  /** Number of tokens generated (shown on complete) */
  tokenCount?: number;
  /** Duration in milliseconds (shown on complete) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * InferenceBadge Component
 *
 * Displays inference status with emerald accent for local, neutral for cloud.
 * Includes ARIA live region for screen reader accessibility.
 */
export function InferenceBadge({
  state,
  source,
  modelName,
  tokenCount,
  duration,
  className,
}: InferenceBadgeProps) {
  // Determine if source is local-like (local or stub) vs cloud
  const isLocal = source === "local" || source === "stub";

  // Generate state text based on state and source
  const stateText = {
    generating: `Generating ${isLocal ? "locally " : ""}via ${modelName}`,
    complete: `Generated ${isLocal ? "locally " : ""}via ${modelName}`,
    error: "Generation failed",
  }[state];

  // Show timing info only when complete and both values are present
  const timingText =
    state === "complete" && duration != null && tokenCount != null
      ? `${(duration / 1000).toFixed(1)}s • ${tokenCount} tokens`
      : null;

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-sm",
        // Mode-aware styling
        isLocal
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
        // Animation for generating state
        state === "generating" && "animate-pulse",
        className
      )}
      data-slot="inference-badge"
      data-source={source}
      data-state={state}
      role="status"
    >
      {/* Indicator dot */}
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          isLocal ? "bg-emerald-500" : "bg-slate-400",
          state === "generating" && "animate-pulse"
        )}
      />

      <span>{stateText}</span>

      {timingText && <span className="text-xs opacity-70">{timingText}</span>}
    </div>
  );
}
