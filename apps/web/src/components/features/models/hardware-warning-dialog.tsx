"use client";

/**
 * HardwareWarningDialog Component
 * Story 2.4: Model Selection & Switching
 *
 * Warns users when selecting a model that may strain their hardware.
 * AC4: Hardware Warning - shows warning about potential performance impact.
 *
 * Task 6.1: Create HardwareWarningDialog.tsx
 * Task 6.2: Compare model requirements against detected hardware
 * Task 6.3: Show warning for models requiring >80% of available RAM
 * Task 6.4: Provide "Proceed Anyway" and "Choose Different" options
 * Task 6.5: Remember user preference "Don't warn again" (persist)
 */

import type { ModelMetadata } from "@continuum/inference";
import type {
  HardwareCapabilities,
  ModelRecommendation,
} from "@continuum/platform";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Storage key for "don't warn again" preference */
const SUPPRESS_WARNING_KEY = "continuum:suppress-hardware-warning";

/** RAM usage threshold for showing warning (80%) */
const RAM_WARNING_THRESHOLD = 0.8;

/** Get color class for RAM usage indicator based on percentage */
function getRamUsageColor(percent: number): string {
  if (percent > 90) {
    return "bg-red-500";
  }
  if (percent > 80) {
    return "bg-yellow-500";
  }
  return "bg-green-500";
}

export type HardwareWarningDialogProps = {
  /** Model being selected */
  model: ModelMetadata;
  /** Detected hardware capabilities */
  hardware: HardwareCapabilities;
  /** Model recommendation level */
  recommendation: ModelRecommendation;
  /** Called when user confirms selection */
  onConfirm: () => void;
  /** Called when user cancels selection */
  onCancel: () => void;
  /** Whether the dialog is visible */
  open: boolean;
};

/**
 * Check if we should show the warning based on RAM usage.
 * Task 6.3: Show warning for models requiring >80% of available RAM.
 */
export function shouldShowHardwareWarning(
  model: ModelMetadata,
  hardware: HardwareCapabilities,
  recommendation: ModelRecommendation
): boolean {
  // Don't warn for recommended models
  if (recommendation === "recommended") {
    return false;
  }

  // Check if user has suppressed warnings
  if (typeof window !== "undefined") {
    const suppressed = localStorage.getItem(SUPPRESS_WARNING_KEY);
    if (suppressed === "true") {
      return false;
    }
  }

  // Calculate RAM usage ratio
  const ramUsageRatio = model.requirements.ramMb / hardware.ram;

  // Task 6.3: Show warning for models requiring >80% of available RAM
  return ramUsageRatio > RAM_WARNING_THRESHOLD;
}

/**
 * Format MB to human-readable string
 */
function formatMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

/**
 * HardwareWarningDialog Component
 *
 * Modal dialog that warns users about potential hardware strain.
 * Provides options to proceed, cancel, or suppress future warnings.
 */
export function HardwareWarningDialog({
  model,
  hardware,
  recommendation,
  onConfirm,
  onCancel,
  open,
}: HardwareWarningDialogProps) {
  const [suppressWarning, setSuppressWarning] = useState(false);

  // Calculate RAM usage for display
  const ramUsagePercent = Math.round(
    (model.requirements.ramMb / hardware.ram) * 100
  );

  // Handle confirm with potential suppression
  const handleConfirm = useCallback(() => {
    if (suppressWarning) {
      localStorage.setItem(SUPPRESS_WARNING_KEY, "true");
    }
    onConfirm();
  }, [suppressWarning, onConfirm]);

  // Handle escape key
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  // Get recommendation-specific styling
  const getRecommendationColor = () => {
    if (recommendation === "not-recommended") {
      return "text-red-600 dark:text-red-400";
    }
    return "text-yellow-600 dark:text-yellow-400";
  };

  return (
    <div
      aria-describedby="hardware-warning-description"
      aria-labelledby="hardware-warning-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="hardware-warning-dialog"
      role="alertdialog"
    >
      <div
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
        data-testid="hardware-warning-content"
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <span aria-hidden="true" className="text-xl">
              {recommendation === "not-recommended" ? "⛔" : "⚠️"}
            </span>
          </div>
          <h2 className="font-semibold text-lg" id="hardware-warning-title">
            Hardware Warning
          </h2>
        </div>

        {/* Description */}
        <div className="mb-6 space-y-3" id="hardware-warning-description">
          <p className="text-muted-foreground">
            <strong className={getRecommendationColor()}>{model.name}</strong>{" "}
            may strain your system&apos;s resources.
          </p>

          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Model requires:</span>
                <div className="font-medium">
                  {formatMb(model.requirements.ramMb)} RAM
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Your system:</span>
                <div className="font-medium">{formatMb(hardware.ram)} RAM</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    getRamUsageColor(ramUsagePercent)
                  )}
                  style={{ width: `${Math.min(100, ramUsagePercent)}%` }}
                />
              </div>
              <span className="font-medium text-xs">{ramUsagePercent}%</span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            Running this model may cause slowdowns or crashes. Consider using a
            smaller model for better performance.
          </p>
        </div>

        {/* Don't warn again checkbox */}
        <div className="mb-4 flex items-center space-x-2">
          <Checkbox
            checked={suppressWarning}
            id="suppress-warning"
            onCheckedChange={(checked) => setSuppressWarning(checked === true)}
          />
          <Label className="text-sm" htmlFor="suppress-warning">
            Don&apos;t show this warning again
          </Label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">
            Choose Different
          </Button>
          <Button
            onClick={handleConfirm}
            variant={
              recommendation === "not-recommended" ? "destructive" : "default"
            }
          >
            Proceed Anyway
          </Button>
        </div>
      </div>

      {/* ARIA live region for announcements */}
      <output aria-live="polite" className="sr-only">
        Hardware warning dialog opened for model {model.name}
      </output>
    </div>
  );
}

/**
 * Reset hardware warning suppression (for testing/settings)
 */
export function resetHardwareWarningPreference(): void {
  localStorage.removeItem(SUPPRESS_WARNING_KEY);
}
