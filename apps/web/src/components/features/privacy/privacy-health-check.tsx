"use client";

/**
 * Privacy Health Check Component
 *
 * Displays privacy health status with three states:
 * - Green (secure): local-only mode AND zero external requests
 * - Yellow (caution): trusted-network mode OR some blocked requests
 * - Red (issue): cloud-enhanced mode OR failed blocks
 *
 * ADR-PRIVACY-005: Three-state health indicator based on mode + network activity
 *
 * Story 1.6: Privacy Dashboard MVP
 */
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { NetworkLogEntry, PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

/**
 * Health status types
 */
export type HealthStatus = "secure" | "caution" | "issue";

export interface PrivacyHealthCheckProps {
  className?: string;
}

/**
 * CVA variants for health check badge styling
 */
const healthVariants = cva(
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-sm",
  {
    variants: {
      status: {
        secure:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        caution:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        issue:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      },
    },
  }
);

/**
 * CVA variants for the status dot indicator
 */
const dotVariants = cva("h-2 w-2 rounded-full", {
  variants: {
    status: {
      secure: "bg-emerald-500",
      caution: "bg-amber-500",
      issue: "bg-rose-500",
    },
  },
});

/**
 * Status labels for display
 */
const statusLabels: Record<HealthStatus, string> = {
  secure: "Privacy Protected",
  caution: "Partial Protection",
  issue: "Privacy Concern",
};

/**
 * Status descriptions for screen readers and tooltips
 */
const statusDescriptions: Record<HealthStatus, string> = {
  secure: "Local-only mode active. No external connections detected.",
  caution: "Some network activity detected or using hybrid mode.",
  issue: "Cloud mode active or privacy blocks failed.",
};

/**
 * Calculate health status based on privacy mode and network activity
 *
 * Logic per ADR-PRIVACY-005:
 * - Green: local-only mode AND zero external requests (blocked or allowed)
 * - Yellow: trusted-network mode OR has some blocked requests
 * - Red: cloud-enhanced mode OR has allowed external requests
 */
export function calculateHealthStatus(
  mode: PrivacyMode,
  log: NetworkLogEntry[]
): HealthStatus {
  const blockedCount = log.filter((e) => e.blocked).length;
  const allowedExternalCount = log.filter((e) => !e.blocked).length;

  // Red: Cloud mode or any allowed external requests (privacy failure)
  if (mode === "cloud-enhanced" || allowedExternalCount > 0) {
    return "issue";
  }

  // Green: Local-only with no network attempts at all
  if (
    mode === "local-only" &&
    blockedCount === 0 &&
    allowedExternalCount === 0
  ) {
    return "secure";
  }

  // Yellow: trusted-network mode OR has blocked attempts (working as intended, but noteworthy)
  return "caution";
}

/**
 * Privacy Health Check Component
 *
 * Displays a badge with current privacy health status.
 * Uses ARIA live region to announce status changes to screen readers.
 */
export function PrivacyHealthCheck({ className }: PrivacyHealthCheckProps) {
  const { mode, networkLog } = usePrivacyStore();

  const status = calculateHealthStatus(mode, networkLog);
  const label = statusLabels[status];
  const description = statusDescriptions[status];

  return (
    <output
      aria-label={`Privacy health: ${label}. ${description}`}
      aria-live="polite"
      className={cn(healthVariants({ status }), className)}
      data-slot="privacy-health-check"
      title={description}
    >
      <span aria-hidden="true" className={dotVariants({ status })} />
      <span>{label}</span>
    </output>
  );
}
