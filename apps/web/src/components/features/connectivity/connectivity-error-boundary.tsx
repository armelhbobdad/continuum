"use client";

import { RefreshIcon, WifiOff01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

/**
 * Check if error is network-related.
 */
function isNetworkError(error: Error): boolean {
  const networkErrorMessages = [
    "network",
    "fetch",
    "failed to fetch",
    "networkerror",
    "connection",
    "offline",
    "timeout",
    "aborted",
  ];

  const message = error.message.toLowerCase();
  return networkErrorMessages.some((term) => message.includes(term));
}

/**
 * ConnectivityErrorBoundary
 *
 * Catches network-related errors and provides graceful recovery UI.
 * Does not alarm users - presents clear options for recovery.
 *
 * Story 4.4: AC1, AC3
 */
export class ConnectivityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isNetworkError: isNetworkError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log for debugging but don't alarm user
    console.error(
      "[ConnectivityErrorBoundary] Caught error:",
      error,
      errorInfo
    );
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
    });
  };

  handleContinueOffline = () => {
    // Clear error and allow offline operation
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 text-center",
            "rounded-lg bg-muted/30"
          )}
          data-slot="connectivity-error-boundary"
          data-testid="connectivity-error-boundary"
          role="alert"
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="mb-4 h-12 w-12 text-muted-foreground"
            icon={WifiOff01Icon}
          />

          <h3 className="mb-2 font-semibold text-lg">
            {this.state.isNetworkError
              ? "Connection interrupted"
              : "Something went wrong"}
          </h3>

          <p className="mb-6 max-w-sm text-muted-foreground text-sm">
            {this.state.isNetworkError
              ? "Don't worry - your work is safe. You can retry when you're back online or continue in offline mode."
              : "An unexpected error occurred. You can try again or continue with limited functionality."}
          </p>

          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
              onClick={this.handleRetry}
              type="button"
            >
              <HugeiconsIcon className="h-4 w-4" icon={RefreshIcon} />
              <span>Try again</span>
            </button>

            {this.state.isNetworkError && (
              <button
                className="rounded-md border border-border px-4 py-2 font-medium text-sm transition-colors hover:bg-muted"
                onClick={this.handleContinueOffline}
                type="button"
              >
                Continue offline
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
