"use client";

/**
 * Context Critical Alert Component
 *
 * Story 3.4: Context Health Indicators
 * Task 7: Inline alert for critical context status.
 *
 * Shows inline alert below header when context reaches critical threshold.
 * Suggests starting a new session to avoid degraded responses.
 *
 * AC #3: Red Critical Threshold
 */
import { Alert01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import { useContextHealth } from "@/hooks/use-context-health";
import { useSessionStore } from "@/stores/session";

/**
 * Context Critical Alert
 *
 * Inline alert shown when context reaches critical threshold.
 * Dismissible per session via local state.
 */
export function ContextCriticalAlert() {
  const { health } = useContextHealth();
  const createSession = useSessionStore((s) => s.createSession);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleNewSession = useCallback(() => {
    createSession("New conversation");
    setIsDismissed(true);
  }, [createSession]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Only show when critical and not dismissed
  if (!health || health.status !== "critical" || isDismissed) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between gap-4 border-t bg-red-50 px-4 py-2 dark:bg-red-950/20"
      data-slot="context-critical-alert"
      data-testid="context-critical-alert"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="h-4 w-4 text-red-600 dark:text-red-400"
          icon={Alert01Icon}
        />
        <span className="text-red-700 text-sm dark:text-red-300">
          Context is nearly full. Consider starting a new session.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          onClick={handleNewSession}
          type="button"
        >
          New Session
        </button>
        <button
          aria-label="Dismiss alert"
          className="rounded-md p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50"
          onClick={handleDismiss}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={Cancel01Icon} />
        </button>
      </div>
    </div>
  );
}
