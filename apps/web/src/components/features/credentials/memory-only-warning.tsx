/**
 * Memory-Only Warning Dialog Component (Story 5.2, AC5)
 *
 * Displays a prominent warning when credentials are stored in memory-only mode.
 * This warning should be shown prominently to users so they understand their
 * credentials will not persist across app restarts.
 *
 * # Usage
 * ```tsx
 * <MemoryOnlyWarning onDismiss={() => setDismissed(true)} />
 * ```
 *
 * # NFR Reference
 * - NFR-CRED-8: Memory-only warning must be prominently displayed
 */

import { useEffect, useState } from "react";
import { useStorageInfo } from "@/hooks/use-storage-info";

/**
 * Props for MemoryOnlyWarning
 */
export interface MemoryOnlyWarningProps {
  /** Callback when the warning is dismissed */
  onDismiss?: () => void;
  /** Whether to auto-show only once per session */
  showOncePerSession?: boolean;
  /** Custom class name */
  className?: string;
  /** Whether to show as a banner (inline) or dialog (overlay) */
  variant?: "banner" | "dialog";
}

const SESSION_STORAGE_KEY = "memory-only-warning-dismissed";

/**
 * Memory-Only Warning Component (AC5, NFR-CRED-8)
 *
 * Prominently warns users when credentials are stored in memory-only mode.
 * The warning can be displayed as a banner or a dialog overlay.
 */
export function MemoryOnlyWarning({
  onDismiss,
  showOncePerSession = false,
  className = "",
  variant = "banner",
}: MemoryOnlyWarningProps) {
  const { isMemoryOnly, isLoading, storageInfo } = useStorageInfo();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check session storage for dismissal
  useEffect(() => {
    if (showOncePerSession) {
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, [showOncePerSession]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (showOncePerSession) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    }
    onDismiss?.();
  };

  // Don't show if loading, not memory-only, or already dismissed
  if (isLoading || !isMemoryOnly || isDismissed) {
    return null;
  }

  // Banner variant (inline)
  if (variant === "banner") {
    return (
      <div
        aria-live="polite"
        className={`relative rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          {/* Warning icon */}
          <div className="flex-shrink-0">
            <svg
              aria-hidden="true"
              className="h-6 w-6 text-amber-600 dark:text-amber-400"
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
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Credentials Not Persisted
            </h3>
            <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
              Your credentials are stored in memory only and will be{" "}
              <strong>lost when you close the app</strong>. This could be
              because:
            </p>
            <ul className="mt-2 ml-4 list-disc text-amber-700 text-sm dark:text-amber-300">
              <li>OS keychain is not available or configured</li>
              <li>Stronghold encrypted vault could not be initialized</li>
              <li>Insufficient permissions for secure storage</li>
            </ul>
            <p className="mt-2 text-amber-700 text-sm dark:text-amber-300">
              Consider enabling OS keychain access or checking app permissions
              for persistent credential storage.
            </p>
          </div>

          {/* Dismiss button */}
          <button
            aria-label="Dismiss warning"
            className="flex-shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:text-amber-400 dark:hover:bg-amber-900 dark:hover:text-amber-300"
            onClick={handleDismiss}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Dialog variant (overlay)
  return (
    <div
      aria-describedby="memory-warning-description"
      aria-labelledby="memory-warning-title"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${className}`}
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-amber-300 bg-white p-6 shadow-xl dark:border-amber-700 dark:bg-gray-900">
        {/* Warning icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-amber-600 dark:text-amber-400"
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
        </div>

        {/* Content */}
        <div className="mt-4 text-center">
          <h3
            className="font-semibold text-gray-900 text-lg dark:text-gray-100"
            id="memory-warning-title"
          >
            Credentials Not Persisted
          </h3>
          <p
            className="mt-2 text-gray-600 text-sm dark:text-gray-400"
            id="memory-warning-description"
          >
            Your credentials are stored in memory only and will be lost when you
            close the app.
          </p>

          <div className="mt-4 rounded-md bg-amber-50 p-3 text-left dark:bg-amber-950">
            <p className="font-medium text-amber-800 text-xs dark:text-amber-200">
              Storage Status: {storageInfo.display_name}
            </p>
            <p className="mt-1 text-amber-700 text-xs dark:text-amber-300">
              {storageInfo.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            className="rounded-md bg-amber-600 px-4 py-2 font-medium text-sm text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            onClick={handleDismiss}
            type="button"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if memory-only warning should be shown
 *
 * Use this to conditionally render the warning component or
 * trigger other UI behaviors.
 */
export function useMemoryOnlyWarningState() {
  const { isMemoryOnly, isLoading } = useStorageInfo();
  const [isDismissed, setIsDismissed] = useState(false);

  const dismiss = () => setIsDismissed(true);

  return {
    shouldShow: !isLoading && isMemoryOnly && !isDismissed,
    isMemoryOnly,
    isLoading,
    isDismissed,
    dismiss,
  };
}

export default MemoryOnlyWarning;
