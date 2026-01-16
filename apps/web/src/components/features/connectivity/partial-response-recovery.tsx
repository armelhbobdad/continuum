"use client";

import { CheckmarkCircle01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import type { PartialResponseState } from "@/types/connectivity-transition";

export interface PartialResponseRecoveryProps {
  partialResponse: PartialResponseState;
  isOnline: boolean;
  onRetry: () => void;
  onKeepPartial: () => void;
  className?: string;
}

/**
 * PartialResponseRecovery
 *
 * Displays interrupted response with recovery options.
 * Non-alarming UX with clear action paths.
 *
 * Story 4.4: AC3
 */
export function PartialResponseRecovery({
  partialResponse,
  isOnline,
  onRetry,
  onKeepPartial,
  className,
}: PartialResponseRecoveryProps) {
  return (
    <section
      aria-label="Interrupted response"
      className={cn(
        "rounded-lg border border-amber-300 border-dashed dark:border-amber-700",
        "bg-amber-50/50 p-4 dark:bg-amber-950/20",
        className
      )}
      data-slot="partial-response-recovery"
      data-testid="partial-response-recovery"
    >
      {/* Partial content preview */}
      <div className="prose prose-sm dark:prose-invert max-w-none opacity-80">
        {partialResponse.content}
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-4 w-2 animate-pulse bg-current opacity-50"
        />
      </div>

      {/* Status message */}
      <div className="mt-3 flex items-center gap-2 text-amber-700 text-sm dark:text-amber-300">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500"
        />
        <span>Response interrupted</span>
        {!isOnline && (
          <span className="text-xs opacity-70">(Waiting for connection)</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            isOnline && partialResponse.retryable
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          )}
          disabled={!(isOnline && partialResponse.retryable)}
          onClick={onRetry}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={RefreshIcon} />
          <span>{isOnline ? "Retry" : "Retry when online"}</span>
        </button>

        <button
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted"
          onClick={onKeepPartial}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={CheckmarkCircle01Icon} />
          <span>Keep partial</span>
        </button>
      </div>

      {/* Error display if retry failed */}
      {partialResponse.error && (
        <p className="mt-2 text-red-600 text-xs dark:text-red-400">
          {partialResponse.error}
        </p>
      )}
    </section>
  );
}
