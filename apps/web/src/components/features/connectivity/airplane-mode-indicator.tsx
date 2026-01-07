"use client";

import { AirplaneModeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/stores/privacy";

const indicatorVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs transition-all duration-300",
  {
    variants: {
      visibility: {
        visible:
          "scale-100 bg-indigo-100 text-indigo-700 opacity-100 dark:bg-indigo-950/30 dark:text-indigo-400",
        hidden: "pointer-events-none scale-95 opacity-0",
      },
    },
    defaultVariants: {
      visibility: "hidden",
    },
  }
);

export interface AirplaneModeIndicatorProps {
  className?: string;
}

/**
 * AirplaneModeIndicator
 *
 * Status badge showing when Airplane Mode is active.
 *
 * Story 4.2: AC1
 */
export function AirplaneModeIndicator({
  className,
}: AirplaneModeIndicatorProps) {
  const airplaneMode = usePrivacyStore((s) => s.airplaneMode);

  return (
    <output
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        indicatorVariants({ visibility: airplaneMode ? "visible" : "hidden" }),
        className
      )}
      data-slot="airplane-mode-indicator"
      data-testid="airplane-mode-indicator"
    >
      <HugeiconsIcon className="h-3 w-3" icon={AirplaneModeIcon} />
      <span>Airplane</span>
    </output>
  );
}
