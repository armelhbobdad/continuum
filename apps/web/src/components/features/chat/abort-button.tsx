"use client";

/**
 * Abort Button Component
 *
 * Button to abort ongoing inference generation.
 * Appears during active generation.
 *
 * Story 1.4: Local Inference Integration
 * AC #4 (Inference Abort)
 */

import { Button } from "@/components/ui/button";

type AbortButtonProps = {
  onAbort: () => void;
  disabled?: boolean;
};

/**
 * Abort Button Component
 *
 * Allows users to stop ongoing AI generation.
 * Shows during active inference.
 */
export function AbortButton({ onAbort, disabled }: AbortButtonProps) {
  return (
    <Button
      aria-label="Stop generating"
      className="min-w-[80px]"
      data-testid="abort-button"
      disabled={disabled}
      onClick={onAbort}
      variant="outline"
    >
      Stop
    </Button>
  );
}
