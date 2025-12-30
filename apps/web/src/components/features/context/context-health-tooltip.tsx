"use client";

/**
 * Context Health Tooltip Component
 *
 * Story 3.4: Context Health Indicators
 * Task 4: Tooltip with detailed context metrics.
 *
 * Shows detailed context metrics on hover:
 * - Token count and percentage
 * - Message count
 * - Model context window
 * - Warning message when growing/critical
 *
 * AC #4: Tooltip Statistics
 */
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";
import type { ContextHealth } from "@/lib/context/context-health";
import { cn } from "@/lib/utils";

interface ContextHealthTooltipProps {
  children: ReactNode;
  health: ContextHealth;
}

/** Status-specific messages for tooltip */
const STATUS_MESSAGES: Record<ContextHealth["status"], string> = {
  healthy: "Context usage is healthy.",
  growing: "Context is growing. Consider wrapping up soon.",
  critical:
    "Context is nearly full. Start a new session to avoid degraded responses.",
};

/**
 * Context Health Tooltip
 *
 * Shows detailed context metrics on hover.
 * Uses Base UI Tooltip primitive per project-context.md.
 */
export function ContextHealthTooltip({
  children,
  health,
}: ContextHealthTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={<span />}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={8}>
            <TooltipPrimitive.Popup
              className={cn(
                "z-50 max-w-xs rounded-lg bg-popover p-3 text-sm shadow-lg ring-1 ring-foreground/5",
                "data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95",
                "data-closed:animate-out data-open:animate-in",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
              )}
              data-slot="context-health-tooltip"
              data-testid="context-health-tooltip"
            >
              <div className="space-y-2">
                <p className="font-medium">{STATUS_MESSAGES[health.status]}</p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
                  <span>Usage:</span>
                  <span className="font-mono">
                    {Math.round(health.percentage)}%
                  </span>

                  <span>Tokens used:</span>
                  <span className="font-mono">
                    {health.tokensUsed.toLocaleString()}
                  </span>

                  <span>Tokens remaining:</span>
                  <span className="font-mono">
                    {health.tokensRemaining.toLocaleString()}
                  </span>

                  <span>Messages:</span>
                  <span className="font-mono">{health.messageCount}</span>

                  <span>Model limit:</span>
                  <span className="font-mono">
                    {health.maxContextLength.toLocaleString()}
                  </span>
                </div>

                {health.status === "critical" && (
                  <p className="mt-2 text-red-600 text-xs dark:text-red-400">
                    Consider starting a new session.
                  </p>
                )}
              </div>
              <TooltipPrimitive.Arrow className="fill-popover" />
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
