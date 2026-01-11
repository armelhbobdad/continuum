/**
 * PreFlightCheckItem Component
 *
 * Individual check item with status icon, message, and optional action.
 * Uses CVA for status-based styling.
 *
 * Story 4.3: AC1, AC2, AC4
 */
"use client";

import {
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Loading02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { PreFlightCheck } from "@/types/preflight";

const itemVariants = cva(
  "flex items-start gap-3 rounded-lg p-3 transition-colors duration-200",
  {
    variants: {
      status: {
        ready: "bg-green-50 dark:bg-green-950/20",
        warning: "bg-amber-50 dark:bg-amber-950/20",
        critical: "bg-red-50 dark:bg-red-950/20",
        checking: "animate-pulse bg-muted/30",
      },
    },
    defaultVariants: {
      status: "checking",
    },
  }
);

const iconVariants = cva("mt-0.5 h-5 w-5 flex-shrink-0", {
  variants: {
    status: {
      ready: "text-green-600 dark:text-green-400",
      warning: "text-amber-600 dark:text-amber-400",
      critical: "text-red-600 dark:text-red-400",
      checking: "animate-spin text-muted-foreground",
    },
  },
  defaultVariants: {
    status: "checking",
  },
});

const statusIcons = {
  ready: CheckmarkCircle01Icon,
  warning: Alert01Icon,
  critical: Cancel01Icon,
  checking: Loading02Icon,
} as const;

export interface PreFlightCheckItemProps {
  check: PreFlightCheck;
  onAction?: () => void | Promise<void>;
  className?: string;
}

/**
 * PreFlightCheckItem
 *
 * Individual check item with status icon, message, and optional action.
 */
export function PreFlightCheckItem({
  check,
  onAction,
  className,
}: PreFlightCheckItemProps) {
  const IconComponent = statusIcons[check.status];

  const handleAction = async () => {
    if (check.action?.onClick) {
      await check.action.onClick();
    }
    onAction?.();
  };

  return (
    <div
      className={cn(itemVariants({ status: check.status }), className)}
      data-slot="preflight-check-item"
      data-status={check.status}
      data-testid={`preflight-check-${check.id}`}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className={iconVariants({ status: check.status })}
        icon={IconComponent}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{check.name}</span>
          {check.status === "ready" && (
            <span className="text-green-600 text-xs dark:text-green-400">
              ✓
            </span>
          )}
        </div>
        <p className="mt-0.5 text-muted-foreground text-sm">{check.message}</p>
        {check.details && (
          <p className="mt-1 text-muted-foreground/70 text-xs">
            {check.details}
          </p>
        )}
      </div>

      {check.action &&
        (check.action.href ? (
          <a
            className="flex-shrink-0 rounded font-medium text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            href={check.action.href}
            rel="noopener"
          >
            {check.action.label}
          </a>
        ) : (
          <button
            className="flex-shrink-0 rounded font-medium text-primary text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={handleAction}
            type="button"
          >
            {check.action.label}
          </button>
        ))}
    </div>
  );
}
