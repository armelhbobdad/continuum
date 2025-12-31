"use client";

/**
 * Session Actions Component
 *
 * Dropdown menu for session actions: export (JSON/Markdown) and delete.
 * Uses Base UI Menu primitive via DropdownMenu.
 *
 * Story 3.3: Session Deletion & Export
 * AC #1 (delete), AC #3 (export format selection)
 */

import {
  Delete02Icon,
  FileExportIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/stores/session";
import { DeleteSessionDialog } from "./delete-session-dialog";

export interface SessionActionsProps {
  /** Session to perform actions on */
  session: Session;
  /** Callback to export session as JSON */
  onExportJson: () => void;
  /** Callback to export session as Markdown */
  onExportMarkdown: () => void;
  /** Callback to delete session (after confirmation) */
  onDelete: () => void;
}

/**
 * Session actions dropdown with export and delete options.
 *
 * Delete action opens confirmation dialog before proceeding.
 * Stops event propagation to prevent session selection.
 */
export function SessionActions({
  session,
  onExportJson,
  onExportMarkdown,
  onDelete,
}: SessionActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    onDelete();
  }, [onDelete]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${session.title}`}
          className="rounded-md p-1 opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <HugeiconsIcon
            className="h-4 w-4 text-muted-foreground"
            icon={MoreVerticalIcon}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onClick={onExportJson}>
            <HugeiconsIcon icon={FileExportIcon} />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportMarkdown}>
            <HugeiconsIcon icon={FileExportIcon} />
            Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
            <HugeiconsIcon icon={Delete02Icon} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteSessionDialog
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        open={deleteDialogOpen}
        sessionTitle={session.title}
      />
    </>
  );
}
