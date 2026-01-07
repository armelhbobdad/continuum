/**
 * PreFlightDialog Component
 *
 * Dialog wrapper for pre-flight checklist, shown before enabling Airplane Mode.
 * Provides Skip and Proceed options based on check results.
 *
 * Story 4.3: AC5 (integration with Story 4.2)
 */
"use client";

import { useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PreFlightChecklist } from "./preflight-checklist";

export interface PreFlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  onSkip: () => void;
}

/**
 * PreFlightDialog
 *
 * Dialog wrapper for pre-flight checklist, shown before enabling Airplane Mode.
 */
export function PreFlightDialog({
  open,
  onOpenChange,
  onProceed,
  onSkip,
}: PreFlightDialogProps) {
  // Track status from child PreFlightChecklist to avoid duplicate hook calls
  const [overallStatus, setOverallStatus] = useState<
    "ready" | "warning" | "critical"
  >("ready");

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const handleProceed = () => {
    onProceed();
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <div data-slot="preflight-dialog" data-testid="preflight-dialog">
          <PreFlightChecklist onStatusChange={setOverallStatus} />

          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded-lg border border-border px-4 py-2 font-medium text-sm transition-colors hover:bg-muted"
              onClick={handleSkip}
              type="button"
            >
              Skip
            </button>
            <button
              className={cn(
                "flex-1 rounded-lg px-4 py-2 font-medium text-sm transition-colors",
                overallStatus === "critical"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={handleProceed}
              type="button"
            >
              {overallStatus === "critical"
                ? "Proceed Anyway"
                : "Enable Airplane Mode"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
