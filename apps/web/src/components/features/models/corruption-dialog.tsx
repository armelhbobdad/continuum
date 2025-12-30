"use client";

/**
 * CorruptionDialog Component
 * Story 2.5: Model Integrity Verification
 *
 * Displays when checksum verification fails.
 * Explains what happened and offers recovery options.
 *
 * AC3: Corrupted File Handling
 * - Shows expected vs actual hash
 * - Options: Re-download or View Quarantine
 * - File is quarantined, not deleted
 *
 * ADR-VERIFY-003: Quarantine before delete
 */

import { Dialog } from "@base-ui/react/dialog";

export interface CorruptionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Model ID that failed verification */
  modelId: string;
  /** Expected hash from registry */
  expectedHash: string;
  /** Actual computed hash */
  actualHash: string;
  /** Callback to re-download the model */
  onRedownload: () => void;
  /** Callback to view quarantine */
  onViewQuarantine: () => void;
}

/**
 * Truncate hash for display (first 8 + last 8 characters)
 */
function truncateHash(hash: string): string {
  if (hash.length <= 20) {
    return hash;
  }
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

/**
 * CorruptionDialog Component
 *
 * Displayed when a downloaded model fails checksum verification.
 * Per AC3: Model is flagged and user is prompted to re-download.
 */
export function CorruptionDialog({
  open,
  onClose,
  modelId,
  expectedHash,
  actualHash,
  onRedownload,
  onViewQuarantine,
}: CorruptionDialogProps) {
  return (
    <Dialog.Root onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          aria-describedby="corruption-description"
          aria-labelledby="corruption-title"
          className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              <span className="text-lg">⚠</span>
            </div>
            <div>
              <Dialog.Title
                className="font-semibold text-lg"
                id="corruption-title"
              >
                Download Verification Failed
              </Dialog.Title>
              <Dialog.Description
                className="mt-1 text-muted-foreground text-sm"
                id="corruption-description"
              >
                The downloaded model file appears to be corrupted or was
                modified during transfer.
              </Dialog.Description>
            </div>
          </div>

          {/* Hash Details */}
          <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span>{modelId}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Expected:</span>
              <span className="text-green-600 dark:text-green-400">
                {truncateHash(expectedHash)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Received:</span>
              <span className="text-red-600 dark:text-red-400">
                {truncateHash(actualHash)}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-4 text-muted-foreground text-sm">
            <p>This can happen due to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Network interruption during download</li>
              <li>Disk storage errors</li>
              <li>File tampering (security concern)</li>
            </ul>
          </div>

          {/* Quarantine Notice */}
          <div className="mt-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-600/30 dark:bg-yellow-900/20">
            <p className="text-yellow-800 dark:text-yellow-200">
              The file has been moved to quarantine for your protection. It will
              not be loaded or executed.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              className="flex-1 rounded bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
              onClick={() => {
                onRedownload();
                onClose();
              }}
              type="button"
            >
              Re-download Model
            </button>
            <button
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              onClick={() => {
                onViewQuarantine();
                onClose();
              }}
              type="button"
            >
              View Quarantine
            </button>
          </div>

          {/* Close Button */}
          <Dialog.Close
            className="absolute top-4 right-4 rounded p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
            type="button"
          >
            <span aria-hidden="true" className="text-xl">
              ×
            </span>
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
