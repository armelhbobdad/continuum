/**
 * OAuth Error Display Component (Story 5.3, AC6)
 *
 * Displays OAuth authentication errors with appropriate actions.
 *
 * # Usage
 * ```tsx
 * <OAuthError
 *   error={error}
 *   errorMessage="Network error occurred"
 *   onRetry={() => handleRetry()}
 *   onCancel={() => handleCancel()}
 * />
 * ```
 *
 * # Features
 * - Error type-specific messaging
 * - Retry button for retriable errors
 * - Clear visual feedback
 */

import { Button } from "@/components/ui/button";
import type { OAuthError as OAuthErrorType } from "@/types";

/**
 * Props for OAuthError
 */
export interface OAuthErrorProps {
  /** The OAuth error object */
  error: OAuthErrorType;
  /** Human-readable error message */
  errorMessage: string;
  /** Callback to retry the OAuth flow */
  onRetry?: () => void;
  /** Callback to cancel */
  onCancel: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get icon for error type
 */
function getErrorIcon(errorType: OAuthErrorType["type"]): React.ReactNode {
  switch (errorType) {
    case "DeepLinkTimeout":
    case "LocalServerTimeout":
      // Clock icon for timeout
      return (
        <svg
          aria-hidden="true"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    case "NetworkError":
      // Wifi-off icon for network errors
      return (
        <svg
          aria-hidden="true"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    case "InvalidState":
    case "InvalidCode":
      // Shield-exclamation for security issues
      return (
        <svg
          aria-hidden="true"
          className="h-8 w-8"
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
    case "Cancelled":
      // X-circle for cancelled
      return (
        <svg
          aria-hidden="true"
          className="h-8 w-8"
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
    default:
      // General error icon
      return (
        <svg
          aria-hidden="true"
          className="h-8 w-8"
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
      );
  }
}

/**
 * Get title for error type
 */
function getErrorTitle(errorType: OAuthErrorType["type"]): string {
  switch (errorType) {
    case "DeepLinkTimeout":
      return "Callback Timed Out";
    case "LocalServerTimeout":
      return "Server Timed Out";
    case "NetworkError":
      return "Network Error";
    case "InvalidState":
      return "Security Check Failed";
    case "InvalidCode":
      return "Invalid Code";
    case "ProviderError":
      return "Provider Error";
    case "Cancelled":
      return "Sign-in Cancelled";
    case "InternalError":
      return "An Error Occurred";
    default:
      return "Authentication Error";
  }
}

/**
 * Get suggestion text for error type
 */
function getErrorSuggestion(errorType: OAuthErrorType["type"]): string | null {
  switch (errorType) {
    case "DeepLinkTimeout":
    case "LocalServerTimeout":
      return "The sign-in callback didn't complete in time. Please try again.";
    case "NetworkError":
      return "Please check your internet connection and try again.";
    case "InvalidState":
      return "This can happen if you use an old sign-in link. Please start a new sign-in.";
    case "InvalidCode":
      return "The authorization code was rejected. Please try signing in again.";
    case "Cancelled":
      return null; // No suggestion needed
    default:
      return "Please try again. If the problem persists, contact support.";
  }
}

/**
 * OAuth Error Display Component
 *
 * Shows error information with appropriate actions based on error type.
 */
export function OAuthError({
  error,
  errorMessage,
  onRetry,
  onCancel,
  className = "",
}: OAuthErrorProps) {
  const title = getErrorTitle(error.type);
  const suggestion = getErrorSuggestion(error.type);

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950 ${className}`}
      role="alert"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-red-600 dark:text-red-400">
          {getErrorIcon(error.type)}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg text-red-800 dark:text-red-200">
            {title}
          </h2>
          <p className="mt-1 text-red-700 text-sm dark:text-red-300">
            {errorMessage}
          </p>
          {suggestion && (
            <p className="mt-2 text-red-600 text-sm dark:text-red-400">
              {suggestion}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
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

        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>

      {/* Technical details (collapsed by default) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-red-600 text-xs hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
          Technical details
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-2 font-mono text-red-800 text-xs dark:bg-red-900 dark:text-red-200">
          {JSON.stringify(error, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default OAuthError;
