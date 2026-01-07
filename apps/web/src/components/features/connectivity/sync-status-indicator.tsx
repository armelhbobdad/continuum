"use client";

import { Loading02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useConnectivityStore } from "@/stores/connectivity";

const indicatorVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs transition-all duration-300",
  {
    variants: {
      status: {
        syncing:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
        pending:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
        idle: "pointer-events-none scale-95 opacity-0",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  }
);

export interface SyncStatusIndicatorProps {
  className?: string;
}

/**
 * SyncStatusIndicator
 *
 * Shows sync status: "Syncing..." when active, pending count when offline with queue.
 *
 * Story 4.5: AC5
 */
export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const isSyncing = useConnectivityStore((s) => s.isSyncing);
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const pendingSyncCount = useConnectivityStore((s) => s.pendingSyncCount);

  // Determine display status
  const status = isSyncing
    ? "syncing"
    : !isOnline && pendingSyncCount > 0
      ? "pending"
      : "idle";

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cn(indicatorVariants({ status }), className)}
      data-slot="sync-status-indicator"
      data-status={status}
      data-testid="sync-status-indicator"
      role="status"
    >
      <HugeiconsIcon
        className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
        icon={isSyncing ? Loading02Icon : RefreshIcon}
      />
      <span>
        {status === "syncing" && "Syncing..."}
        {status === "pending" && `${pendingSyncCount} pending`}
      </span>
    </div>
  );
}
