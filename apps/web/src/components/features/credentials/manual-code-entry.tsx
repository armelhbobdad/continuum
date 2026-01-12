/**
 * Manual Code Entry Component (Story 5.3, AC3)
 *
 * Fallback UI for manual OAuth authorization code entry.
 * Used when deep link and local server callbacks fail.
 *
 * # Usage
 * ```tsx
 * <ManualCodeEntry
 *   onSubmit={(code) => handleSubmit(code)}
 *   onCancel={() => handleCancel()}
 * />
 * ```
 *
 * # Features
 * - Text input for authorization code
 * - Validation feedback
 * - Submit and cancel actions
 * - Instructions for users
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Regex pattern for validating authorization codes.
 * OAuth codes are typically alphanumeric strings with possible dashes, dots, and slashes.
 */
const CODE_PATTERN = /^[\w\-./]+$/;

/**
 * Props for ManualCodeEntry
 */
export interface ManualCodeEntryProps {
  /** Callback when user submits a code */
  onSubmit: (code: string) => Promise<void>;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Validate authorization code format
 *
 * OAuth codes are typically alphanumeric strings of varying length.
 */
function isValidCode(code: string): boolean {
  // Minimum length check and basic format
  return code.length >= 10 && CODE_PATTERN.test(code);
}

/**
 * Manual Code Entry Component
 *
 * Provides fallback UI for entering OAuth authorization codes manually.
 */
export function ManualCodeEntry({
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = "",
}: ManualCodeEntryProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Please enter the authorization code");
      return;
    }

    if (!isValidCode(trimmedCode)) {
      setError(
        "Invalid code format. The code should be at least 10 characters."
      );
      return;
    }

    // Submit
    setError(null);
    setIsLoading(true);

    try {
      await onSubmit(trimmedCode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit code";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <svg
          aria-hidden="true"
          className="mx-auto mb-3 h-12 w-12 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
        <h2 className="font-semibold text-gray-900 text-xl dark:text-gray-100">
          Enter Authorization Code
        </h2>
        <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">
          Copy the authorization code from the browser and paste it below.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Label className="mb-2 block" htmlFor="auth-code">
            Authorization Code
          </Label>
          <Input
            aria-describedby={error ? "code-error" : undefined}
            aria-invalid={!!error}
            autoComplete="off"
            autoFocus
            className="font-mono"
            disabled={isSubmitting || isLoading}
            id="auth-code"
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Paste your code here..."
            type="text"
            value={code}
          />
          {error && (
            <p
              className="mt-2 text-red-600 text-sm dark:text-red-400"
              id="code-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={!code.trim() || isSubmitting || isLoading}
            type="submit"
          >
            {isSubmitting || isLoading ? (
              <>
                <svg
                  aria-hidden="true"
                  className="mr-2 -ml-1 h-4 w-4 animate-spin"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                  />
                </svg>
                Verifying...
              </>
            ) : (
              "Submit Code"
            )}
          </Button>
          <Button
            disabled={isSubmitting || isLoading}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-2 font-medium text-gray-900 text-sm dark:text-gray-100">
          How to find the code
        </h3>
        <ol className="list-inside list-decimal space-y-1 text-gray-600 text-sm dark:text-gray-400">
          <li>Complete sign-in in the browser window</li>
          <li>After authorization, look for a page showing a code</li>
          <li>Copy the entire code and paste it above</li>
        </ol>
      </div>
    </div>
  );
}

export default ManualCodeEntry;
