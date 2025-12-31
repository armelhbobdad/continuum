"use client";

/**
 * Privacy Dashboard Component
 *
 * Slide-in panel showing:
 * - Privacy health check indicator
 * - Current privacy mode
 * - Network activity log
 * - Verify independently link
 * - Keyboard shortcut display
 *
 * ADR-UI-004: Dashboard opens via Privacy Indicator click or keyboard shortcut
 *
 * Story 1.6: Privacy Dashboard MVP
 */
import { Dialog } from "@base-ui/react/dialog";
import { Cancel01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/stores/privacy";
import { NetworkLog } from "./network-log";
import { PrivacyHealthCheck } from "./privacy-health-check";
import { PrivacyIndicator } from "./privacy-indicator";

export interface PrivacyDashboardProps {
  className?: string;
}

/**
 * Verification documentation URL
 * TODO: Update with actual docs URL when available
 */
const VERIFY_DOCS_URL = "https://docs.continuum.ai/verify-privacy";

/** Pattern to detect Apple platforms for modifier key display */
const MAC_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/;

/**
 * Hook to detect modifier key (Cmd on Mac, Ctrl elsewhere)
 * Uses useEffect to ensure navigator is only accessed on client
 */
function useModifierKey(): string {
  const [modifierKey, setModifierKey] = useState("Ctrl");

  useEffect(() => {
    // Check userAgent inside useEffect to avoid SSR issues
    // navigator.platform is deprecated, using userAgent instead
    const isMac = MAC_PLATFORM_PATTERN.test(window.navigator.userAgent);
    setModifierKey(isMac ? "Cmd" : "Ctrl");
  }, []);

  return modifierKey;
}

/**
 * Privacy Dashboard Component
 *
 * A slide-in panel displaying privacy status and network activity.
 * Uses Base UI Dialog for accessible modal behavior.
 */
export function PrivacyDashboard({ className }: PrivacyDashboardProps) {
  const { isDashboardOpen, closeDashboard } = usePrivacyStore();
  const modifierKey = useModifierKey();

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          closeDashboard();
        }
      }}
      open={isDashboardOpen}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/40" />
        <Dialog.Popup
          className={cn(
            "fixed top-0 right-0 h-full w-96 max-w-full",
            "bg-white dark:bg-slate-900",
            "border-slate-200 border-l shadow-lg dark:border-slate-700",
            "overflow-y-auto",
            "slide-in-from-right animate-in duration-200",
            className
          )}
          data-slot="privacy-dashboard"
        >
          <div className="p-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Privacy Dashboard
                </Dialog.Title>
                <PrivacyHealthCheck />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm dark:text-slate-400">
                  Current mode:
                </span>
                <PrivacyIndicator as="span" />
              </div>
            </div>

            {/* Network Activity Section */}
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
                  Network Activity
                </h3>
                <NetworkLog />
              </section>

              {/* Verify Independently Section */}
              <section className="border-slate-200 border-t pt-4 dark:border-slate-700">
                <h3 className="mb-2 font-medium text-slate-700 text-sm dark:text-slate-300">
                  Verify Independently
                </h3>
                <p className="mb-3 text-slate-500 text-sm dark:text-slate-400">
                  Don&apos;t take our word for it. Use external tools to verify
                  your privacy.
                </p>
                <a
                  className="inline-flex items-center gap-1.5 text-emerald-600 text-sm hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  href={VERIFY_DOCS_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View verification guide
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="h-4 w-4"
                    icon={LinkSquare02Icon}
                    size={16}
                  />
                </a>
              </section>

              {/* Keyboard Shortcut Info */}
              <section className="text-slate-400 text-xs dark:text-slate-500">
                <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                  {modifierKey}+Shift+P
                </kbd>{" "}
                to toggle this panel
              </section>
            </div>
          </div>

          {/* Close Button */}
          <Dialog.Close
            aria-label="Close privacy dashboard"
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="h-5 w-5"
              icon={Cancel01Icon}
              size={20}
            />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
