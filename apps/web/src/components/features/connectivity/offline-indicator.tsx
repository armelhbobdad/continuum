"use client";

import { Wifi02Icon, WifiDisconnected02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useConnectivityStore } from "@/stores/connectivity";

const indicatorVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs transition-all duration-300",
  {
    variants: {
      status: {
        online:
          "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
        offline:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
        unstable:
          "animate-pulse bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
      },
      visibility: {
        visible: "scale-100 opacity-100",
        hidden: "pointer-events-none scale-95 opacity-0",
      },
    },
    defaultVariants: {
      status: "online",
      visibility: "hidden",
    },
  }
);

export interface OfflineIndicatorProps
  extends VariantProps<typeof indicatorVariants> {
  /** Always show indicator (even when online) - for debugging */
  alwaysShow?: boolean;
  className?: string;
}

/**
 * OfflineIndicator
 *
 * Displays connectivity status badge in status bar.
 * Only visible when offline or connection is unstable.
 *
 * Story 4.1: AC2 - Offline Badge Display
 */
export function OfflineIndicator({
  alwaysShow = false,
  className,
}: OfflineIndicatorProps) {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const isStable = useConnectivityStore((s) => s.isStable);

  // Determine current status
  const getStatus = () => {
    if (!isOnline) {
      return "offline";
    }
    if (!isStable) {
      return "unstable";
    }
    return "online";
  };
  const status = getStatus();

  // Only show when offline or unstable (unless alwaysShow)
  const shouldShow = alwaysShow || !isOnline || !isStable;

  return (
    <output
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        indicatorVariants({
          status,
          visibility: shouldShow ? "visible" : "hidden",
        }),
        className
      )}
      data-slot="offline-indicator"
      data-status={status}
      data-testid="offline-indicator"
    >
      <HugeiconsIcon
        className="h-3.5 w-3.5"
        icon={isOnline ? Wifi02Icon : WifiDisconnected02Icon}
      />
      <span>
        {status === "offline" && "Offline"}
        {status === "unstable" && "Connecting..."}
        {status === "online" && alwaysShow && "Online"}
      </span>
    </output>
  );
}
