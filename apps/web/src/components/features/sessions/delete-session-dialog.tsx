"use client";

/**
 * Delete Session Dialog Component
 *
 * Confirmation dialog for session deletion with ARIA alertdialog role.
 * Uses Base UI Dialog primitive per project-context.md.
 *
 * Story 3.3: Session Deletion & Export
 * AC #1 (confirmation dialog), AC #2 (deletion)
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeleteSessionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Title of the session being deleted */
  sessionTitle: string;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
}

/**
 * Confirmation dialog for deleting a session.
 *
 * Uses alertdialog role per WAI-ARIA for destructive actions.
 * Includes permanent deletion warning per AC #1.
 */
export function DeleteSessionDialog({
  open,
  sessionTitle,
  onConfirm,
  onCancel,
}: DeleteSessionDialogProps) {
  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onCancel()} open={open}>
      <DialogContent role="alertdialog" size="sm">
        <DialogTitle>Delete session?</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete &quot;{sessionTitle}&quot;? This
          action cannot be undone.
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
