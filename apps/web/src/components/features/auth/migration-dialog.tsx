/**
 * Migration Dialog Component (Story 5.5 Task 8)
 *
 * Dialog for choosing how to handle anonymous data during migration.
 *
 * # Usage
 * ```tsx
 * <MigrationDialog />
 * ```
 *
 * # Features
 * - Three migration options as radio buttons (AC2)
 * - Shows anonymous session count
 * - Disabled during migration (AC4)
 * - Accessible with ARIA labels
 *
 * AC2: Migration Choice Dialog
 * AC4: Block during migration
 */

"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMigration } from "@/hooks/use-migration";
import type { MigrationChoice } from "@/types/migration";
import { MigrationProgress } from "./migration-progress";
import { MigrationResult } from "./migration-result";

/**
 * Props for MigrationDialog
 */
export interface MigrationDialogProps {
  /** Custom class name */
  className?: string;
}

/**
 * Migration option configuration
 */
interface MigrationOption {
  value: MigrationChoice;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Merge icon
 */
const MergeIcon = () => (
  <svg
    aria-hidden="true"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * Keep Separate icon
 */
const KeepSeparateIcon = () => (
  <svg
    aria-hidden="true"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * Discard icon
 */
const DiscardIcon = () => (
  <svg
    aria-hidden="true"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * Migration options configuration
 */
const MIGRATION_OPTIONS: MigrationOption[] = [
  {
    value: "merge",
    label: "Merge Data",
    description:
      "Combine your local sessions with your account. All your work will be synced.",
    icon: <MergeIcon />,
  },
  {
    value: "keep-separate",
    label: "Keep Separate",
    description:
      "Start fresh with your account. Local sessions stay on this device only.",
    icon: <KeepSeparateIcon />,
  },
  {
    value: "discard",
    label: "Discard Local",
    description: "Delete all local sessions and start fresh with your account.",
    icon: <DiscardIcon />,
  },
];

/**
 * Migration Dialog Component
 *
 * Displays migration choice options when user logs in with existing anonymous sessions.
 */
export function MigrationDialog({ className = "" }: MigrationDialogProps) {
  const {
    status,
    anonymousSessionCount,
    showDialog,
    isInProgress,
    result,
    startMigration,
    closeDialog,
    reset,
  } = useMigration();

  const [selectedChoice, setSelectedChoice] = useState<MigrationChoice | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle migration start
   */
  const handleStartMigration = useCallback(async () => {
    if (!selectedChoice) {
      return;
    }

    setIsSubmitting(true);
    try {
      await startMigration(selectedChoice);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChoice, startMigration]);

  /**
   * Handle dialog close after completion
   */
  const handleComplete = useCallback(() => {
    reset();
    closeDialog();
    setSelectedChoice(null);
  }, [reset, closeDialog]);

  /**
   * Handle retry after failure
   */
  const handleRetry = useCallback(() => {
    reset();
    setSelectedChoice(null);
  }, [reset]);

  // Don't render if dialog shouldn't be shown
  if (!showDialog) {
    return null;
  }

  // Show progress during migration
  if (isInProgress) {
    return (
      <Dialog modal open>
        <DialogContent
          aria-describedby="migration-progress-description"
          aria-labelledby="migration-progress-title"
          className={className}
          size="default"
        >
          <DialogTitle id="migration-progress-title">
            Migrating Your Data
          </DialogTitle>
          <DialogDescription id="migration-progress-description">
            Please wait while we migrate your sessions...
          </DialogDescription>
          <MigrationProgress />
        </DialogContent>
      </Dialog>
    );
  }

  // Show result after completion
  if (status === "completed" || status === "failed") {
    return (
      <Dialog modal open>
        <DialogContent
          aria-describedby="migration-result-description"
          aria-labelledby="migration-result-title"
          className={className}
          size="default"
        >
          <DialogTitle id="migration-result-title">
            {result?.success ? "Migration Complete" : "Migration Failed"}
          </DialogTitle>
          <DialogDescription id="migration-result-description">
            {result?.success
              ? "Your data has been migrated successfully."
              : "There was a problem migrating your data."}
          </DialogDescription>
          <MigrationResult
            onComplete={handleComplete}
            onRetry={handleRetry}
            result={result}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Show choice dialog
  return (
    <Dialog modal open>
      <DialogContent
        aria-describedby="migration-dialog-description"
        aria-labelledby="migration-dialog-title"
        className={className}
        size="lg"
      >
        <DialogTitle id="migration-dialog-title">
          What would you like to do with your local data?
        </DialogTitle>
        <DialogDescription id="migration-dialog-description">
          You have{" "}
          <strong>
            {anonymousSessionCount}{" "}
            {anonymousSessionCount === 1 ? "session" : "sessions"}
          </strong>{" "}
          stored locally on this device. Choose how you&apos;d like to handle
          them.
        </DialogDescription>

        {/* Migration Options */}
        <div
          aria-label="Migration options"
          className="mt-6 space-y-3"
          role="radiogroup"
        >
          {MIGRATION_OPTIONS.map((option) => (
            <label
              className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                selectedChoice === option.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              }`}
              key={option.value}
            >
              <input
                checked={selectedChoice === option.value}
                className="sr-only"
                name="migration-choice"
                onChange={() => setSelectedChoice(option.value)}
                type="radio"
                value={option.value}
              />
              <div
                className={`flex-shrink-0 rounded-full p-2 ${
                  selectedChoice === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    selectedChoice === option.value ? "text-primary" : ""
                  }`}
                >
                  {option.label}
                </div>
                <div className="mt-1 text-muted-foreground text-sm">
                  {option.description}
                </div>
              </div>
              {selectedChoice === option.value && (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 flex-shrink-0 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    fillRule="evenodd"
                  />
                </svg>
              )}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={closeDialog} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!selectedChoice || isSubmitting}
            onClick={handleStartMigration}
            type="button"
          >
            {isSubmitting ? (
              <>
                <svg
                  aria-hidden="true"
                  className="mr-2 -ml-0.5 h-4 w-4 animate-spin"
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
                Starting...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MigrationDialog;
