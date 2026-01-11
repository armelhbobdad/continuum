"use client";

import { CloudIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useConnectivityStore } from "@/stores/connectivity";
import { usePrivacyStore } from "@/stores/privacy";

export interface OfflineFeatureGateProps {
  /** Feature name for display */
  feature: string;
  /** Whether this feature requires cloud connectivity */
  requiresCloud: boolean;
  /** Local alternative suggestion */
  localAlternative?: string;
  /** Children to render when feature is available */
  children: ReactNode;
  /** Custom message override */
  message?: string;
  className?: string;
}

/**
 * OfflineFeatureGate
 *
 * Conditionally renders children or a friendly message based on connectivity.
 * Used to gate cloud-only features with helpful messaging.
 *
 * Story 4.5: AC4
 */
export function OfflineFeatureGate({
  feature,
  requiresCloud,
  localAlternative,
  children,
  message,
  className,
}: OfflineFeatureGateProps) {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const airplaneMode = usePrivacyStore((s) => s.airplaneMode);

  // Feature available if online OR doesn't require cloud
  const isAvailable = !requiresCloud || (isOnline && !airplaneMode);

  if (isAvailable) {
    return <>{children}</>;
  }

  // Render friendly unavailable message
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg p-6",
        "bg-muted/30 text-muted-foreground",
        className
      )}
      data-feature={feature}
      data-slot="offline-feature-gate"
      data-testid="offline-feature-gate"
    >
      <HugeiconsIcon className="h-8 w-8 opacity-50" icon={CloudIcon} />
      <div className="space-y-1 text-center">
        <p className="font-medium">
          {message ?? `${feature} requires an internet connection`}
        </p>
        {localAlternative && (
          <p className="text-sm opacity-80">
            Try {localAlternative} instead while offline
          </p>
        )}
        {airplaneMode && (
          <p className="text-sm opacity-80">
            Disable Airplane Mode to use this feature
          </p>
        )}
      </div>
    </div>
  );
}
