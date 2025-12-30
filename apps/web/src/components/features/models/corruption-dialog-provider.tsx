"use client";

/**
 * CorruptionDialogProvider Component
 * Story 2.5: Model Integrity Verification
 *
 * Listens for corruption events and renders the CorruptionDialog.
 * Should be mounted once at app level (in providers).
 *
 * AC3: Corrupted File Handling
 */

import { useCorruptionDialog } from "@/hooks/use-corruption-dialog";
import { CorruptionDialog } from "./corruption-dialog";

/**
 * Provider component that renders the CorruptionDialog when needed.
 * Must be rendered once at app level.
 */
export function CorruptionDialogProvider(): React.ReactNode {
  const { isOpen, corruption, close, redownload, viewQuarantine } =
    useCorruptionDialog();

  if (!corruption) {
    return null;
  }

  return (
    <CorruptionDialog
      actualHash={corruption.actualHash}
      expectedHash={corruption.expectedHash}
      modelId={corruption.modelId}
      onClose={close}
      onRedownload={redownload}
      onViewQuarantine={viewQuarantine}
      open={isOpen}
    />
  );
}
