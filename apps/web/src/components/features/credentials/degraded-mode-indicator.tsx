/**
 * Degraded Mode Indicator Component (Story 5.4, AC3)
 *
 * Displays the current offline authentication mode with visual indicators
 * for access level and days remaining.
 *
 * # Usage
 * ```tsx
 * <DegradedModeIndicator />
 * ```
 *
 * # Features
 * - Shows current degraded mode (FullAccess, ReadOnly, RequiresReauth)
 * - Visual access level indicator with colors
 * - Days remaining badge for offline validity
 * - Refresh needed indicator
 * - Loading and error states
 */

"use client";

import type { ReactNode } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import type { DegradedMode } from "@/types/credentials";

/**
 * Props for DegradedModeIndicator
 */
export interface DegradedModeIndicatorProps {
  /** Show detailed view with days remaining */
  showDetails?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Always show indicator (even in FullAccess mode) */
  alwaysShow?: boolean;
}

/**
 * Get icon for degraded mode
 */
function getModeIcon(mode: DegradedMode): ReactNode {
  switch (mode) {
    case "FullAccess":
      // Checkmark circle for full access
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
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
    case "ReadOnly":
      // Eye icon for read-only mode
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
          <path
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    case "RequiresReauth":
      // Lock closed icon for requires reauth
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Get color classes for degraded mode
 */
function getModeColors(mode: DegradedMode): {
  bg: string;
  text: string;
  border: string;
} {
  switch (mode) {
    case "FullAccess":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
      };
    case "ReadOnly":
      return {
        bg: "bg-amber-50 dark:bg-amber-950",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
      };
    case "RequiresReauth":
      return {
        bg: "bg-red-50 dark:bg-red-950",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-950",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-200 dark:border-gray-800",
      };
  }
}

/**
 * Get display name for degraded mode
 */
function getModeDisplayName(mode: DegradedMode): string {
  switch (mode) {
    case "FullAccess":
      return "Full Access";
    case "ReadOnly":
      return "Read Only";
    case "RequiresReauth":
      return "Sign In Required";
    default:
      return "Unknown";
  }
}

/**
 * Get description for degraded mode
 */
function getModeDescription(mode: DegradedMode): string {
  switch (mode) {
    case "FullAccess":
      return "You have full access to all features including write operations.";
    case "ReadOnly":
      return "Offline credentials are expiring. Write operations are disabled until you reconnect.";
    case "RequiresReauth":
      return "Offline session has expired. Please sign in again when connected.";
    default:
      return "";
  }
}

/**
 * Degraded Mode Indicator Component
 *
 * Displays the current offline authentication mode in the settings or status UI.
 */
export function DegradedModeIndicator({
  showDetails = true,
  compact = false,
  className = "",
  alwaysShow = false,
}: DegradedModeIndicatorProps) {
  const { degradedMode, daysRemaining, needsRefresh, error } = useOfflineAuth();
  const colors = getModeColors(degradedMode);

  // Don't show in FullAccess mode unless alwaysShow is true
  if (!alwaysShow && degradedMode === "FullAccess") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950 ${className}`}
        data-testid="degraded-mode-indicator"
        role="alert"
      >
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <span className="text-sm">Failed to check offline status</span>
        </div>
      </div>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <output
        aria-label={`Offline mode: ${getModeDisplayName(degradedMode)}`}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${colors.bg} ${colors.border} ${colors.text} ${className}`}
        data-testid="degraded-mode-indicator"
        title={getModeDescription(degradedMode)}
      >
        {getModeIcon(degradedMode)}
        <span className="font-medium text-sm">
          {getModeDisplayName(degradedMode)}
        </span>
        {daysRemaining > 0 && daysRemaining <= 7 && (
          <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-xs dark:bg-black/30">
            {daysRemaining}d
          </span>
        )}
      </output>
    );
  }

  // Full display
  return (
    <output
      aria-label={`Offline authentication mode: ${getModeDisplayName(degradedMode)}`}
      className={`block rounded-lg border ${colors.border} ${colors.bg} p-4 ${className}`}
      data-testid="degraded-mode-indicator"
    >
      <div className="flex items-start gap-3">
        <div className={`${colors.text} mt-0.5`}>
          {getModeIcon(degradedMode)}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${colors.text}`}>
              {getModeDisplayName(degradedMode)}
            </h3>

            {/* Days remaining badge */}
            {daysRemaining > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 font-medium text-xs ${
                  daysRemaining <= 7
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200 ring-inset dark:bg-amber-900 dark:text-amber-300 dark:ring-amber-800"
                    : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 ring-inset dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
                }`}
              >
                {daysRemaining} days remaining
              </span>
            )}

            {/* Refresh needed badge */}
            {needsRefresh && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs ring-1 ring-blue-200 ring-inset dark:bg-blue-900 dark:text-blue-300 dark:ring-blue-800">
                Refresh needed
              </span>
            )}
          </div>

          {showDetails && (
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {getModeDescription(degradedMode)}
            </p>
          )}

          {/* Reauth warning */}
          {degradedMode === "RequiresReauth" && (
            <div className="mt-2 flex items-start gap-2 rounded bg-red-100 p-2 text-red-800 dark:bg-red-900/50 dark:text-red-200">
              <svg
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  fillRule="evenodd"
                />
              </svg>
              <span className="text-xs">
                Your offline session has expired. Please connect to the internet
                and sign in again to continue.
              </span>
            </div>
          )}

          {/* Read-only warning */}
          {degradedMode === "ReadOnly" && (
            <div className="mt-2 flex items-start gap-2 rounded bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <svg
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  fillRule="evenodd"
                />
              </svg>
              <span className="text-xs">
                Write operations are disabled. Connect to refresh your
                credentials before they expire.
              </span>
            </div>
          )}
        </div>
      </div>
    </output>
  );
}

export default DegradedModeIndicator;
