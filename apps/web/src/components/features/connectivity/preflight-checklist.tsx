/**
 * PreFlightChecklist Component
 *
 * Full checklist component with all pre-flight checks and summary.
 * Uses the usePreFlightChecks hook to manage check state.
 *
 * Story 4.3: AC1-5
 */
"use client";

import {
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";
import { useEffect, useRef } from "react";

import { usePreFlightChecks } from "@/hooks/use-preflight-checks";
import { cn } from "@/lib/utils";
import { PreFlightCheckItem } from "./preflight-check-item";

const summaryVariants = cva("mt-4 flex items-center gap-2 rounded-lg p-4", {
  variants: {
    status: {
      ready:
        "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
      warning:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      critical: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    },
  },
  defaultVariants: {
    status: "ready",
  },
});

const summaryMessages = {
  ready: "Ready for offline!",
  warning: "Ready with warnings",
  critical: "Some items need attention",
} as const;

const summaryIcons = {
  ready: CheckmarkCircle01Icon,
  warning: Alert01Icon,
  critical: Cancel01Icon,
} as const;

export interface PreFlightChecklistProps {
  className?: string;
  /** Called after manual refresh with the resulting status */
  onComplete?: (status: "ready" | "warning" | "critical") => void;
  /** Called whenever overall status changes (including on mount) */
  onStatusChange?: (status: "ready" | "warning" | "critical") => void;
}

/**
 * PreFlightChecklist
 *
 * Full checklist component with all pre-flight checks and summary.
 */
export function PreFlightChecklist({
  className,
  onComplete,
  onStatusChange,
}: PreFlightChecklistProps) {
  const { checks, isLoading, overallStatus, runChecks, rerunCheck } =
    usePreFlightChecks();

  const readyCount = checks.filter((c) => c.status === "ready").length;
  const SummaryIcon = summaryIcons[overallStatus];

  // Notify parent of status changes (including initial load)
  const previousStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isLoading && previousStatusRef.current !== overallStatus) {
      previousStatusRef.current = overallStatus;
      onStatusChange?.(overallStatus);
    }
  }, [isLoading, overallStatus, onStatusChange]);

  const handleRefresh = async () => {
    await runChecks();
    // Note: onComplete is called with potentially stale status here
    // for backwards compatibility. Use onStatusChange for reactive updates.
    onComplete?.(overallStatus);
  };

  return (
    <div
      className={cn("w-full max-w-md", className)}
      data-slot="preflight-checklist"
      data-testid="preflight-checklist"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">Pre-Flight Check</h2>
        <button
          aria-label="Refresh checks"
          className="rounded-md p-1.5 transition-colors hover:bg-muted disabled:opacity-50"
          disabled={isLoading}
          onClick={handleRefresh}
          type="button"
        >
          <HugeiconsIcon
            className={cn("h-4 w-4", isLoading && "animate-spin")}
            icon={RefreshIcon}
          />
        </button>
      </div>

      {/* Check Items */}
      <div className="space-y-2">
        {checks.map((check) => (
          <PreFlightCheckItem
            check={check}
            key={check.id}
            onAction={() => rerunCheck(check.id)}
          />
        ))}
      </div>

      {/* Summary */}
      {!isLoading && checks.length > 0 && (
        <div className={summaryVariants({ status: overallStatus })}>
          <HugeiconsIcon className="h-5 w-5" icon={SummaryIcon} />
          <div className="flex-1">
            <p className="font-medium">{summaryMessages[overallStatus]}</p>
            <p className="text-sm opacity-80">
              {readyCount} of {checks.length} checks passed
            </p>
          </div>
        </div>
      )}

      {/* Encouraging message for ready state */}
      {overallStatus === "ready" && !isLoading && checks.length > 0 && (
        <p className="mt-4 text-center text-muted-foreground text-sm">
          You're all set for offline work. Go confidently!
        </p>
      )}
    </div>
  );
}
