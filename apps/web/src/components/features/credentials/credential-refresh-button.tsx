/**
 * Credential Refresh Button Component (Story 5.4, AC7)
 *
 * Button for manually refreshing credentials when online.
 * Shows loading state during refresh and feedback on completion.
 *
 * # Usage
 * ```tsx
 * <CredentialRefreshButton />
 * ```
 *
 * # Features
 * - Manual credential refresh trigger
 * - Loading spinner during refresh
 * - Success/error feedback
 * - Disabled when offline or already refreshing
 */

"use client";

import { useCallback, useState } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import { useConnectivityStore } from "@/stores/connectivity";

/**
 * Props for CredentialRefreshButton
 */
export interface CredentialRefreshButtonProps {
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Show text label */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when refresh completes */
  onRefreshComplete?: (success: boolean, error?: string) => void;
}

/**
 * Get variant classes
 */
function getVariantClasses(variant: "primary" | "secondary" | "ghost"): string {
  switch (variant) {
    case "primary":
      return "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800";
    case "secondary":
      return "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800";
    case "ghost":
      return "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-700";
    default:
      return "";
  }
}

/**
 * Get size classes
 */
function getSizeClasses(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "px-2 py-1 text-xs gap-1.5";
    case "md":
      return "px-3 py-1.5 text-sm gap-2";
    case "lg":
      return "px-4 py-2 text-base gap-2";
    default:
      return "";
  }
}

/**
 * Credential Refresh Button Component
 *
 * Allows users to manually refresh their credentials (AC7).
 */
export function CredentialRefreshButton({
  variant = "secondary",
  size = "md",
  showLabel = true,
  className = "",
  onRefreshComplete,
}: CredentialRefreshButtonProps) {
  const { refreshCredentials, isRefreshing, needsRefresh, degradedMode } =
    useOfflineAuth();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRefresh = useCallback(async () => {
    setFeedback(null);
    const result = await refreshCredentials();

    if (result) {
      if (result.success) {
        setFeedback({ type: "success", message: "Credentials refreshed" });
        onRefreshComplete?.(true);
      } else {
        const errorMessage = result.error ?? "Refresh failed";
        setFeedback({ type: "error", message: errorMessage });
        onRefreshComplete?.(false, errorMessage);
      }

      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [refreshCredentials, onRefreshComplete]);

  // Can only refresh when online and not already refreshing
  const canRefresh = isOnline && !isRefreshing;

  // Determine if button should be shown
  // Show when: needs refresh, or in degraded mode, or always show when offline
  const shouldShow =
    needsRefresh ||
    degradedMode === "ReadOnly" ||
    degradedMode === "RequiresReauth";

  if (!shouldShow) {
    return null;
  }

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <button
        aria-busy={isRefreshing}
        aria-label={
          isRefreshing ? "Refreshing credentials..." : "Refresh credentials"
        }
        className={`inline-flex items-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses}`}
        data-testid="credential-refresh-button"
        disabled={!canRefresh}
        onClick={handleRefresh}
        type="button"
      >
        {/* Refresh icon or spinner */}
        {isRefreshing ? (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
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
        ) : (
          <svg
            aria-hidden="true"
            className="h-4 w-4"
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
        )}

        {/* Label */}
        {showLabel && <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>}
      </button>

      {/* Feedback message */}
      {feedback && (
        <output
          className={`mt-1 text-xs ${
            feedback.type === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
          data-testid="refresh-feedback"
        >
          {feedback.message}
        </output>
      )}

      {/* Offline notice */}
      {!isOnline && (
        <span
          className="mt-1 text-gray-500 text-xs dark:text-gray-400"
          data-testid="offline-notice"
        >
          Connect to internet to refresh
        </span>
      )}
    </div>
  );
}

export default CredentialRefreshButton;
