/**
 * Migration Result Component (Story 5.5 Task 10)
 *
 * Displays migration completion result with success/failure state.
 *
 * # Usage
 * ```tsx
 * <MigrationResult
 *   result={result}
 *   onComplete={() => handleComplete()}
 *   onRetry={() => handleRetry()}
 * />
 * ```
 *
 * # Features
 * - Success message with migrated count (AC3)
 * - Error message with retry option (AC5)
 * - Continue button to dismiss
 * - Styled success (green) / failure (red)
 */

"use client";

import { Button } from "@/components/ui/button";
import type { MigrationResult as MigrationResultType } from "@/types/migration";

/**
 * Props for MigrationResult
 */
export interface MigrationResultProps {
  /** Migration result */
  result: MigrationResultType | null;
  /** Callback when user clicks Continue */
  onComplete: () => void;
  /** Callback to retry migration (on failure) */
  onRetry?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Success icon
 */
const SuccessIcon = () => (
  <svg
    aria-hidden="true"
    className="h-12 w-12"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * Error icon
 */
const ErrorIcon = () => (
  <svg
    aria-hidden="true"
    className="h-12 w-12"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * Migration Result Component
 *
 * Shows success or failure state after migration completes.
 */
export function MigrationResult({
  result,
  onComplete,
  onRetry,
  className = "",
}: MigrationResultProps) {
  if (!result) {
    return null;
  }

  const { success, error, sessionsMigrated } = result;

  // Success state
  if (success) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Success indicator */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900 dark:text-green-400">
            <SuccessIcon />
          </div>
          <div>
            <p className="font-medium text-green-700 text-lg dark:text-green-300">
              Migration Successful
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              {sessionsMigrated === 0
                ? "No sessions needed to be migrated."
                : `Successfully migrated ${sessionsMigrated} ${sessionsMigrated === 1 ? "session" : "sessions"} to your account.`}
            </p>
          </div>
        </div>

        {/* Continue button */}
        <div className="flex justify-center">
          <Button onClick={onComplete} type="button">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Failure state
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error indicator */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900 dark:text-red-400">
          <ErrorIcon />
        </div>
        <div>
          <p className="font-medium text-lg text-red-700 dark:text-red-300">
            Migration Failed
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {error ?? "An unexpected error occurred during migration."}
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Don&apos;t worry - your local data is still safe. You can try again
            or choose a different option.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} type="button" variant="default">
            <svg
              aria-hidden="true"
              className="mr-2 -ml-0.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Try Again
          </Button>
        )}
        <Button onClick={onComplete} type="button" variant="outline">
          Continue Without Migrating
        </Button>
      </div>
    </div>
  );
}

export default MigrationResult;
