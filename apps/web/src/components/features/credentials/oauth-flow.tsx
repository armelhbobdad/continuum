/**
 * OAuth Flow Component (Story 5.3, AC1-AC4; Story 5.5 Integration)
 *
 * Displays OAuth authentication progress with visual feedback.
 * Supports 2-tier fallback: Deep Link -> Local Server.
 *
 * Story 5.5: Integrates migration dialog for anonymous-to-authenticated flow.
 * Shows MigrationDialog after OAuth completes if user has anonymous sessions.
 *
 * # Usage
 * ```tsx
 * <OAuthFlow
 *   provider="google"
 *   onComplete={() => console.log("OAuth complete")}
 *   onCancel={() => console.log("OAuth cancelled")}
 * />
 * ```
 *
 * # Features
 * - Step-by-step progress indicator
 * - Countdown timer for timeout states
 * - Error display with retry option
 * - Migration dialog after OAuth (Story 5.5)
 */

import { useEffect, useState } from "react";
import { MigrationDialog } from "@/components/features/auth/migration-dialog";
import { Button } from "@/components/ui/button";
import { useMigration, useOAuthFlow } from "@/hooks";
import type { OAuthProvider } from "@/types";
import { OAuthError } from "./oauth-error";

/**
 * Props for OAuthFlow
 */
export interface OAuthFlowProps {
  /** OAuth provider to authenticate with */
  provider?: OAuthProvider;
  /** Callback when OAuth completes successfully */
  onComplete?: () => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get step icon based on state
 */
function getStepIcon(
  stepNumber: number,
  currentStep: number,
  isComplete: boolean
): React.ReactNode {
  if (isComplete && stepNumber <= currentStep) {
    // Completed step - checkmark
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-green-600 dark:text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M5 13l4 4L19 7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    );
  }
  if (stepNumber === currentStep) {
    // Current step - spinning loader
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400"
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
    );
  }
  // Future step - empty circle
  return (
    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
  );
}

/**
 * Get background class for step indicator
 */
function getStepBackgroundClass(isPast: boolean, isActive: boolean): string {
  if (isPast) {
    return "bg-green-100 dark:bg-green-900";
  }
  if (isActive) {
    return "bg-blue-100 dark:bg-blue-900";
  }
  return "bg-gray-100 dark:bg-gray-800";
}

/**
 * Get text class for step label
 */
function getStepTextClass(isPast: boolean, isActive: boolean): string {
  if (isActive) {
    return "font-medium text-blue-700 dark:text-blue-300";
  }
  if (isPast) {
    return "text-green-700 dark:text-green-300";
  }
  return "text-gray-500 dark:text-gray-400";
}

/**
 * Step names for display
 */
const STEP_NAMES = [
  "Opening browser",
  "Waiting for callback",
  "Completing sign-in",
];

/**
 * Render a single step item in the progress indicator
 */
function StepItem({
  name,
  stepNum,
  currentStep,
  isOAuthComplete,
}: {
  name: string;
  stepNum: number;
  currentStep: number;
  isOAuthComplete: boolean;
}) {
  const isActive = stepNum === currentStep;
  const isPast = stepNum < currentStep || isOAuthComplete;

  return (
    <li
      aria-current={isActive ? "step" : undefined}
      className="flex flex-1 flex-col items-center"
    >
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${getStepBackgroundClass(isPast, isActive)}`}
      >
        {getStepIcon(stepNum, currentStep, isOAuthComplete)}
      </div>
      <span
        className={`text-center text-xs ${getStepTextClass(isPast, isActive)}`}
      >
        {name}
      </span>
    </li>
  );
}

/**
 * OAuth Flow Component
 *
 * Displays the OAuth authentication flow with progress indicators.
 * Story 5.5: Integrates migration dialog for anonymous-to-authenticated flow.
 */
export function OAuthFlow({
  provider,
  onComplete,
  onCancel,
  className = "",
}: OAuthFlowProps) {
  const {
    progress,
    isLoading,
    isComplete: isOAuthComplete,
    isFailed,
    currentStep,
    stepDescription,
    error,
    errorMessage,
    canRetry,
    timeoutRemaining,
    startOAuth,
    cancelOAuth,
    retryOAuth,
  } = useOAuthFlow();

  // Story 5.5: Migration integration (Task 12.1)
  const {
    showDialog: showMigrationDialog,
    status: migrationStatus,
    anonymousSessionCount,
  } = useMigration();

  const [hasStarted, setHasStarted] = useState(false);

  // Story 5.5: Determine if truly complete (OAuth done AND migration handled)
  // Complete = OAuth complete AND (no anonymous sessions OR migration completed)
  const isTrulyComplete =
    isOAuthComplete &&
    (anonymousSessionCount === 0 ||
      migrationStatus === "completed" ||
      migrationStatus === "failed");

  // Notify parent when truly complete (OAuth + migration handled)
  useEffect(() => {
    if (isTrulyComplete) {
      onComplete?.();
    }
  }, [isTrulyComplete, onComplete]);

  // Start OAuth flow automatically on mount
  useEffect(() => {
    if (!(hasStarted || isLoading || isOAuthComplete || isFailed)) {
      setHasStarted(true);
      startOAuth(provider);
    }
  }, [hasStarted, isLoading, isOAuthComplete, isFailed, provider, startOAuth]);

  // Handle cancel
  const handleCancel = async () => {
    await cancelOAuth();
    onCancel?.();
  };

  // Show error state
  if (isFailed && error) {
    return (
      <OAuthError
        className={className}
        error={error}
        errorMessage={errorMessage ?? "An error occurred"}
        onCancel={handleCancel}
        onRetry={canRetry ? retryOAuth : undefined}
      />
    );
  }

  // Story 5.5: Show migration dialog when OAuth complete and user has anonymous sessions (Task 12.2, 12.3)
  // MigrationDialog blocks app usage until migration choice is made (AC4)
  if (isOAuthComplete && showMigrationDialog) {
    return (
      <>
        <output
          className={`block rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950 ${className}`}
        >
          <div className="flex items-center gap-3">
            <svg
              aria-hidden="true"
              className="h-8 w-8 text-blue-600 dark:text-blue-400"
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
            <div>
              <h3 className="font-medium text-blue-800 text-lg dark:text-blue-200">
                Sign-in Complete
              </h3>
              <p className="text-blue-700 text-sm dark:text-blue-300">
                Please choose how to handle your existing sessions.
              </p>
            </div>
          </div>
        </output>
        <MigrationDialog />
      </>
    );
  }

  // Show completion state (no migration needed or migration done)
  if (isTrulyComplete) {
    return (
      <output
        className={`block rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950 ${className}`}
      >
        <div className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            className="h-8 w-8 text-green-600 dark:text-green-400"
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
          <div>
            <h3 className="font-medium text-green-800 text-lg dark:text-green-200">
              Sign-in Complete
            </h3>
            <p className="text-green-700 text-sm dark:text-green-300">
              You have been successfully authenticated.
            </p>
          </div>
        </div>
      </output>
    );
  }

  // Show loading/progress state
  return (
    <section
      aria-busy={isLoading}
      aria-label="OAuth authentication in progress"
      aria-live="polite"
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="font-semibold text-gray-900 text-xl dark:text-gray-100">
          Signing In
        </h2>
        <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
          {stepDescription}
        </p>
      </div>

      {/* Progress steps */}
      <div className="mb-6">
        <ol aria-label="Sign-in progress" className="flex justify-between">
          {STEP_NAMES.map((name, index) => (
            <StepItem
              currentStep={currentStep}
              isOAuthComplete={isOAuthComplete}
              key={name}
              name={name}
              stepNum={index + 1}
            />
          ))}
        </ol>
      </div>

      {/* Timeout countdown */}
      {timeoutRemaining !== null && timeoutRemaining > 0 && (
        <div className="mb-4 text-center">
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Waiting for response... ({Math.ceil(timeoutRemaining / 1000)}s)
          </p>
        </div>
      )}

      {/* Local server info */}
      {progress.state.type === "AwaitingLocalServer" && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
          <p className="text-blue-700 text-sm dark:text-blue-300">
            Using local authentication server on port{" "}
            <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">
              {progress.state.port}
            </code>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        {progress.cancellable && (
          <Button onClick={handleCancel} type="button" variant="outline">
            Cancel
          </Button>
        )}
      </div>

      {/* Help text */}
      <p className="mt-4 text-center text-gray-500 text-xs dark:text-gray-400">
        A browser window should have opened. Complete sign-in there and you'll
        be redirected back automatically.
      </p>
    </section>
  );
}

export default OAuthFlow;
