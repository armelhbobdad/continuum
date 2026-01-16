/**
 * Migration Progress Component (Story 5.5 Task 9)
 *
 * Displays migration progress with current step and cancel option.
 *
 * # Usage
 * ```tsx
 * <MigrationProgress />
 * ```
 *
 * # Features
 * - Progress bar with percentage (AC4)
 * - Current step description
 * - Cancel button (AC5)
 * - ARIA live region for progress announcements
 */

"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMigration } from "@/hooks/use-migration";

/**
 * Props for MigrationProgress
 */
export interface MigrationProgressProps {
  /** Custom class name */
  className?: string;
  /** Whether cancel button is disabled */
  canCancel?: boolean;
}

/**
 * Migration Progress Component
 *
 * Shows progress bar and current step during migration.
 */
export function MigrationProgress({
  className = "",
  canCancel = true,
}: MigrationProgressProps) {
  const { progress, cancelMigration } = useMigration();
  const [isCancelling, setIsCancelling] = useState(false);

  const percentage = progress?.percentage ?? 0;
  const current = progress?.current ?? 0;
  const total = progress?.total ?? 0;
  const step = progress?.step ?? "Preparing migration...";

  /**
   * Handle cancel request
   */
  const handleCancel = useCallback(async () => {
    if (isCancelling) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelMigration();
    } finally {
      setIsCancelling(false);
    }
  }, [cancelMigration, isCancelling]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress description - ARIA live region */}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="text-center text-muted-foreground text-sm"
      >
        {step}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          aria-label={`Migration progress: ${percentage}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percentage}
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Progress stats */}
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>
            {current} of {total} {total === 1 ? "session" : "sessions"}
          </span>
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Animated spinner */}
      <div className="flex justify-center">
        <svg
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <div className="flex justify-center pt-2">
          <Button
            disabled={isCancelling}
            onClick={handleCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isCancelling ? "Cancelling..." : "Cancel Migration"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MigrationProgress;
