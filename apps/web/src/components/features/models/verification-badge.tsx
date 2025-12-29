"use client";

/**
 * VerificationBadge Component
 * Story 2.5: Model Integrity Verification
 *
 * Displays the verification status of a downloaded model.
 * Uses CVA for status-based styling variants.
 *
 * AC2: Verified Badge Display
 * AC4: Manual Verification Trigger
 *
 * ADR-VERIFY-004: Verification status persisted and displayed
 */

import type { VerificationStatus } from "@continuum/inference";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * CVA variants for VerificationBadge based on verification status.
 * Per project-context.md: CVA patterns established in Epic 1
 */
const badgeVariants = cva(
  // Base styles
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
  {
    variants: {
      status: {
        verified: "bg-green-500/10 text-green-700 dark:text-green-400",
        unverified: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
        failed: "bg-red-500/10 text-red-700 dark:text-red-400",
        verifying: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
    },
    defaultVariants: {
      status: "unverified",
    },
  }
);

export interface VerificationBadgeProps
  extends VariantProps<typeof badgeVariants> {
  /** Verification status to display */
  status: VerificationStatus;
  /** Verification timestamp (for tooltip) */
  timestamp?: number;
  /** Additional CSS classes */
  className?: string;
}

/** Icons for each status (using simple Unicode for now) */
const statusIcons: Record<VerificationStatus, string> = {
  verified: "\u2713", // checkmark
  unverified: "\u2015", // em dash
  failed: "\u2717", // X mark
  verifying: "\u27F3", // clockwise arrow
};

/** Labels for each status */
const statusLabels: Record<VerificationStatus, string> = {
  verified: "Verified",
  unverified: "Unverified",
  failed: "Failed",
  verifying: "Verifying...",
};

/** ARIA labels for each status */
const statusAriaLabels: Record<VerificationStatus, string> = {
  verified: "Model integrity verified",
  unverified: "Model not yet verified",
  failed: "Model verification failed - integrity may be compromised",
  verifying: "Verification in progress",
};

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * VerificationBadge Component
 *
 * Displays verification status with appropriate styling and accessibility.
 * AC2: Shows "Verified" badge with timestamp on hover
 */
export function VerificationBadge({
  status,
  timestamp,
  className,
}: VerificationBadgeProps) {
  const tooltipText = timestamp
    ? `${statusLabels[status]} on ${formatTimestamp(timestamp)}`
    : statusLabels[status];

  return (
    <span
      aria-label={statusAriaLabels[status]}
      className={cn(badgeVariants({ status }), className)}
      data-slot="verification-badge"
      role="img"
      title={tooltipText}
    >
      <span aria-hidden="true">{statusIcons[status]}</span>
      <span>{statusLabels[status]}</span>
    </span>
  );
}

/**
 * Verify Now Button Component
 *
 * Button to trigger manual verification (AC4).
 * Used alongside VerificationBadge for user-initiated verification.
 */
export type VerifyNowButtonProps = {
  /** Callback when verify is clicked */
  onVerify: () => void;
  /** Whether verification is in progress */
  isVerifying?: boolean;
  /** Additional CSS classes */
  className?: string;
};

export function VerifyNowButton({
  onVerify,
  isVerifying = false,
  className,
}: VerifyNowButtonProps) {
  return (
    <button
      aria-busy={isVerifying}
      className={cn(
        "rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700",
        className
      )}
      disabled={isVerifying}
      onClick={onVerify}
      type="button"
    >
      {isVerifying ? "Verifying..." : "Verify Now"}
    </button>
  );
}
