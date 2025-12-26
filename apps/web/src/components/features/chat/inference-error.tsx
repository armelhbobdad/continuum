"use client";

/**
 * Inference Error Component
 *
 * Displays user-friendly error messages for inference failures
 * with recovery suggestions and retry functionality.
 *
 * Story 1.4: Local Inference Integration
 * AC #6 (Error Handling)
 */

import type { InferenceError } from "@continuum/inference";
import { INFERENCE_ERROR_MESSAGES } from "@continuum/inference";
import { Button } from "@/components/ui/button";

interface InferenceErrorDisplayProps {
  error: InferenceError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Get user-friendly message and recovery hint for an error code
 */
function getErrorDetails(error: InferenceError): {
  userMessage: string;
  recoveryHint: string;
} {
  const mapping = INFERENCE_ERROR_MESSAGES[error.code];
  if (mapping) {
    return mapping;
  }

  // Fallback for unknown errors
  return {
    userMessage: error.userMessage || "Something went wrong.",
    recoveryHint: "Please try again or restart the application.",
  };
}

/**
 * Inference Error Display Component
 *
 * Shows error message with recovery suggestion.
 * Includes retry button for recoverable errors.
 */
export function InferenceErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: InferenceErrorDisplayProps) {
  const { userMessage, recoveryHint } = getErrorDetails(error);
  const isRecoverable = error.code !== "MODEL_LOAD_FAILED";

  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-4"
      data-testid="inference-error-display"
      role="alert"
    >
      <div className="flex flex-col gap-3">
        {/* Error message */}
        <div>
          <p className="font-medium text-destructive">{userMessage}</p>
          <p className="mt-1 text-muted-foreground text-sm">{recoveryHint}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isRecoverable && onRetry ? (
            <Button
              data-testid="error-retry-button"
              onClick={onRetry}
              size="sm"
              variant="outline"
            >
              Try Again
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              data-testid="error-dismiss-button"
              onClick={onDismiss}
              size="sm"
              variant="ghost"
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
