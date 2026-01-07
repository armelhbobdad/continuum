"use client";

import {
  AirplaneModeIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/stores/privacy";

export interface CloudFeatureBlockedProps {
  /** Name of the blocked feature (e.g., "Cloud Sync", "Cloud Inference") */
  featureName: string;
  /** Optional local alternative suggestion */
  localAlternative?: string;
  className?: string;
}

/**
 * CloudFeatureBlocked
 *
 * Message displayed when a cloud feature is unavailable due to Airplane Mode.
 * Provides explanation and quick toggle to disable Airplane Mode.
 *
 * Story 4.2: AC3
 */
export function CloudFeatureBlocked({
  featureName,
  localAlternative,
  className,
}: CloudFeatureBlockedProps) {
  const setAirplaneMode = usePrivacyStore((s) => s.setAirplaneMode);

  const handleDisable = () => {
    setAirplaneMode(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20",
        className
      )}
      data-slot="cloud-feature-blocked"
      data-testid="cloud-feature-blocked"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
          <HugeiconsIcon
            className="h-5 w-5 text-amber-600 dark:text-amber-400"
            icon={AirplaneModeIcon}
          />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-amber-800 text-sm dark:text-amber-200">
            {featureName} is unavailable
          </h3>
          <p className="text-amber-700 text-xs dark:text-amber-300">
            Airplane Mode is active. Network features are blocked to ensure
            offline operation.
          </p>
        </div>
      </div>

      {localAlternative && (
        <div className="flex items-start gap-2 rounded-md bg-amber-100/50 p-2 dark:bg-amber-900/20">
          <HugeiconsIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            icon={InformationCircleIcon}
          />
          <p className="text-amber-700 text-xs dark:text-amber-300">
            {localAlternative}
          </p>
        </div>
      )}

      <button
        className="self-start rounded-md bg-amber-200 px-3 py-1.5 font-medium text-amber-800 text-xs transition-colors hover:bg-amber-300 dark:bg-amber-800/40 dark:text-amber-200 dark:hover:bg-amber-800/60"
        onClick={handleDisable}
        type="button"
      >
        Disable Airplane Mode
      </button>
    </div>
  );
}
