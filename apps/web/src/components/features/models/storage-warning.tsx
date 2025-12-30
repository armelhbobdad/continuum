"use client";

/**
 * StorageWarning Component
 * Story 2.3: Model Download Manager - Task 8
 *
 * Displays storage space validation warnings before download.
 * AC5: Storage space validation with clear messaging
 *
 * ADR-DOWNLOAD-001: Pre-download validation
 */

import type { StorageCheckResult } from "@continuum/inference";
import { Alert02Icon, HardDriveIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export interface StorageWarningProps {
  /** Storage check result */
  result: StorageCheckResult;
  /** Model name for display */
  modelName?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when user wants to proceed anyway (if available) */
  onProceedAnyway?: () => void;
  /** Callback when user wants to cancel */
  onCancel?: () => void;
}

/**
 * Format MB to human-readable string
 */
function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * StorageWarning Component
 *
 * Shows storage space warning with clear space requirements.
 * AC5: Clear error message with space requirements
 */
export function StorageWarning({
  result,
  modelName,
  className,
  onProceedAnyway,
  onCancel,
}: StorageWarningProps) {
  if (result.hasSpace) {
    return null;
  }

  return (
    <div
      aria-labelledby="storage-warning-title"
      className={cn(
        "rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30",
        className
      )}
      data-slot="storage-warning"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          icon={Alert02Icon}
        />
        <div className="flex-1 space-y-2">
          <h3
            className="font-semibold text-amber-800 text-sm dark:text-amber-200"
            id="storage-warning-title"
          >
            Insufficient Storage Space
          </h3>

          <p className="text-amber-700 text-sm dark:text-amber-300">
            {modelName
              ? `Not enough disk space to download ${modelName}.`
              : "Not enough disk space for this download."}
          </p>

          {/* Space breakdown */}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <HugeiconsIcon
                  aria-hidden="true"
                  className="h-4 w-4"
                  icon={HardDriveIcon}
                />
                Required space:
              </dt>
              <dd className="font-medium text-amber-800 dark:text-amber-200">
                {formatMb(result.requiredMb)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-amber-700 dark:text-amber-400">
                Available space:
              </dt>
              <dd className="font-medium text-amber-800 dark:text-amber-200">
                {formatMb(result.availableMb)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-amber-200 border-t pt-1 dark:border-amber-800">
              <dt className="font-medium text-amber-800 dark:text-amber-200">
                Shortfall:
              </dt>
              <dd className="font-bold text-red-600 dark:text-red-400">
                {formatMb(result.shortfallMb)}
              </dd>
            </div>
          </dl>

          {/* Suggestions */}
          <div className="mt-3 rounded border border-amber-200 bg-amber-100/50 p-2 dark:border-amber-800 dark:bg-amber-900/30">
            <h4 className="font-medium text-amber-800 text-xs dark:text-amber-200">
              Suggestions:
            </h4>
            <ul className="mt-1 list-inside list-disc text-amber-700 text-xs dark:text-amber-400">
              <li>Clear disk space by removing unused files</li>
              <li>Choose a smaller model variant</li>
              <li>Delete unused downloaded models</li>
            </ul>
          </div>

          {/* Actions */}
          {(onCancel ?? onProceedAnyway) ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              {onCancel ? (
                <button
                  className="rounded px-3 py-1.5 text-amber-700 text-sm hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
              {onProceedAnyway ? (
                <button
                  className="rounded bg-amber-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-amber-700"
                  onClick={onProceedAnyway}
                  type="button"
                >
                  Try Anyway
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export interface StorageWarningInlineProps {
  /** Storage check result */
  result: StorageCheckResult;
  /** Additional CSS classes */
  className?: string;
}

export function StorageWarningInline({
  result,
  className,
}: StorageWarningInlineProps) {
  if (result.hasSpace) {
    return null;
  }

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-amber-600 text-xs dark:text-amber-400",
        className
      )}
      role="alert"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="h-3 w-3"
        icon={Alert02Icon}
      />
      Need {formatMb(result.shortfallMb)} more space
    </p>
  );
}
