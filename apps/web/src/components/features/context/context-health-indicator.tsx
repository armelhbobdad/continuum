"use client";

/**
 * Context Health Indicator Component
 *
 * Story 3.4: Context Health Indicators
 * Task 3: Visual indicator for context health status.
 *
 * Displays context usage status with color-coded badge:
 * - Healthy (green): < 50% context used
 * - Growing (yellow): 50-79% context used
 * - Critical (red): >= 80% context used
 *
 * FR55: Context health indicator
 * AC #1, #2, #3, #4
 */
import { Activity01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { useContextHealth } from "@/hooks/use-context-health";
import { cn } from "@/lib/utils";
import { ContextHealthTooltip } from "./context-health-tooltip";

/**
 * CVA variants for status colors.
 * Per project-context.md: Use CVA for component variants.
 */
const indicatorVariants = cva(
  "flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs transition-colors",
  {
    variants: {
      status: {
        healthy:
          "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
        growing:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
        critical:
          "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      status: "healthy",
    },
  }
);

export interface ContextHealthIndicatorProps
  extends VariantProps<typeof indicatorVariants> {
  className?: string;
}

/**
 * Context Health Indicator
 *
 * Displays context usage status with color-coded badge.
 * Hover for detailed tooltip with token counts.
 */
export function ContextHealthIndicator({
  className,
}: ContextHealthIndicatorProps) {
  const { health, isLoading } = useContextHealth();

  // Don't show if no health data or loading
  if (isLoading || !health) {
    return null;
  }

  // Don't show if no messages yet
  if (health.messageCount === 0) {
    return null;
  }

  return (
    <ContextHealthTooltip health={health}>
      <output
        aria-label={`Context health: ${health.status}, ${Math.round(health.percentage)}% used`}
        aria-live="polite"
        className={cn(indicatorVariants({ status: health.status }), className)}
        data-slot="context-health-indicator"
        data-testid="context-health-indicator"
      >
        <HugeiconsIcon className="h-3.5 w-3.5" icon={Activity01Icon} />
        <span>{Math.round(health.percentage)}%</span>
      </output>
    </ContextHealthTooltip>
  );
}
