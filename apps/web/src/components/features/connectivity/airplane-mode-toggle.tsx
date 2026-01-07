"use client";

import {
  AirplaneModeIcon,
  AirplaneModeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

const toggleVariants = cva(
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-sm transition-all duration-200",
  {
    variants: {
      active: {
        true: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-700",
        false: "bg-muted/50 text-muted-foreground hover:bg-muted",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

/** Map privacy mode to display name */
const MODE_DISPLAY_NAMES: Record<PrivacyMode, string> = {
  "trusted-network": "Hybrid",
  "cloud-enhanced": "Cloud",
  "local-only": "Local-only",
};

export interface AirplaneModeToggleProps {
  className?: string;
  /** Called before enabling - return false to cancel */
  onBeforeEnable?: () => boolean | Promise<boolean>;
}

/**
 * AirplaneModeToggle
 *
 * Toggle control for Airplane Mode - forces local-only regardless of privacy mode.
 *
 * Story 4.2: AC1, AC5
 */
export function AirplaneModeToggle({
  className,
  onBeforeEnable,
}: AirplaneModeToggleProps) {
  const airplaneMode = usePrivacyStore((s) => s.airplaneMode);
  const previousMode = usePrivacyStore((s) => s.previousMode);
  const setAirplaneMode = usePrivacyStore((s) => s.setAirplaneMode);

  const handleDisable = () => {
    setAirplaneMode(false);
    const modeName = MODE_DISPLAY_NAMES[previousMode ?? "local-only"];
    toast.success("Airplane Mode disabled", {
      description: `Returned to ${modeName} mode`,
      duration: 3000,
    });
  };

  const handleEnable = async () => {
    if (onBeforeEnable) {
      const proceed = await onBeforeEnable();
      if (!proceed) {
        return;
      }
    }
    setAirplaneMode(true);
    toast.success("Airplane Mode enabled", {
      description: "All network activity is now blocked",
      duration: 3000,
    });
  };

  const handleToggle = () => {
    if (airplaneMode) {
      handleDisable();
    } else {
      handleEnable();
    }
  };

  return (
    <button
      aria-label={
        airplaneMode ? "Disable Airplane Mode" : "Enable Airplane Mode"
      }
      aria-pressed={airplaneMode}
      className={cn(toggleVariants({ active: airplaneMode }), className)}
      data-slot="airplane-mode-toggle"
      data-testid="airplane-mode-toggle"
      onClick={handleToggle}
      type="button"
    >
      <HugeiconsIcon
        className="h-4 w-4"
        icon={airplaneMode ? AirplaneModeIcon : AirplaneModeOffIcon}
      />
      <span className="sr-only md:not-sr-only">
        {airplaneMode ? "Airplane" : "Airplane Off"}
      </span>
    </button>
  );
}
