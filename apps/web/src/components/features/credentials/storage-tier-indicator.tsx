/**
 * Storage Tier Indicator Component (Story 5.2, AC6)
 *
 * Displays the current credential storage tier with visual indicators
 * for security level and persistence status.
 *
 * # Usage
 * ```tsx
 * <StorageTierIndicator />
 * ```
 *
 * # Features
 * - Shows current storage tier (Keychain, Stronghold, MemoryOnly)
 * - Visual security level indicator (Highest, Good, Limited)
 * - Persistence status badge
 * - Tooltip with detailed description
 * - Loading and error states
 */

import type { ReactNode } from "react";
import { useStorageInfo } from "@/hooks/use-storage-info";
import type { SecurityLevel, StorageTier } from "@/types/credentials";

/**
 * Props for StorageTierIndicator
 */
export interface StorageTierIndicatorProps {
  /** Show detailed view with description */
  showDescription?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Get icon for storage tier
 */
function getTierIcon(tier: StorageTier): ReactNode {
  switch (tier) {
    case "Keychain":
      // Shield icon for OS keychain (highest security)
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    case "Stronghold":
      // Lock icon for encrypted vault
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
    case "MemoryOnly":
      // Exclamation icon for memory-only (warning)
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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
 * Get color classes for security level
 */
function getSecurityLevelColors(level: SecurityLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case "Highest":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
      };
    case "Good":
      return {
        bg: "bg-blue-50 dark:bg-blue-950",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800",
      };
    case "Limited":
      return {
        bg: "bg-amber-50 dark:bg-amber-950",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
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
 * Storage Tier Indicator Component
 *
 * Displays the current credential storage tier status in the settings UI.
 */
export function StorageTierIndicator({
  showDescription = true,
  compact = false,
  className = "",
}: StorageTierIndicatorProps) {
  const { storageInfo, isLoading, error, isMemoryOnly } = useStorageInfo();
  const colors = getSecurityLevelColors(storageInfo.security_level);

  // Loading state
  if (isLoading) {
    return (
      <output
        aria-busy="true"
        aria-label="Loading storage information"
        className={`block animate-pulse rounded-lg border p-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </output>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950 ${className}`}
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
          <span className="text-sm">Failed to load storage info</span>
        </div>
      </div>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <output
        aria-label={`Storage: ${storageInfo.display_name}`}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${colors.bg} ${colors.border} ${colors.text} ${className}`}
        title={storageInfo.description}
      >
        {getTierIcon(storageInfo.tier)}
        <span className="font-medium text-sm">{storageInfo.display_name}</span>
      </output>
    );
  }

  // Full display
  return (
    <output
      aria-label={`Credential storage: ${storageInfo.display_name}`}
      className={`block rounded-lg border ${colors.border} ${colors.bg} p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${colors.text} mt-0.5`}>
          {getTierIcon(storageInfo.tier)}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${colors.text}`}>
              {storageInfo.display_name}
            </h3>

            {/* Security level badge */}
            <span
              className={`rounded-full px-2 py-0.5 font-medium text-xs ${colors.text} ${colors.bg} ring-1 ring-inset ${colors.border}`}
            >
              {storageInfo.security_level}
            </span>

            {/* Persistence badge */}
            {storageInfo.persists_on_restart ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs ring-1 ring-gray-200 ring-inset dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
                Persists
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs ring-1 ring-amber-200 ring-inset dark:bg-amber-900 dark:text-amber-300 dark:ring-amber-800">
                Session Only
              </span>
            )}
          </div>

          {showDescription && (
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {storageInfo.description}
            </p>
          )}

          {/* Memory-only warning */}
          {isMemoryOnly && (
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
                Credentials will be lost when the app closes. Enable OS keychain
                or Stronghold for persistent storage.
              </span>
            </div>
          )}
        </div>
      </div>
    </output>
  );
}

export default StorageTierIndicator;
