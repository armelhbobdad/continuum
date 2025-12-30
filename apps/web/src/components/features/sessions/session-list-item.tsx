"use client";

/**
 * Session List Item Component
 *
 * Individual session item with CVA variants for virtualized list.
 * Displays session title, relative timestamp, and unsaved indicator.
 *
 * Story 3.1: Session History & Navigation
 * AC #1 (session display), AC #3 (session selection)
 */

import { cva, type VariantProps } from "class-variance-authority";
import { memo } from "react";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import type { Session } from "@/stores/session";

/**
 * CVA variants for session item states.
 * Per project-context.md: Use CVA for component variants.
 */
const sessionItemVariants = cva(
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg p-2 text-left text-sm transition-colors",
  {
    variants: {
      state: {
        default: "hover:bg-muted focus:bg-muted focus:outline-none",
        selected: "bg-muted font-medium",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

export interface SessionListItemProps
  extends VariantProps<typeof sessionItemVariants> {
  /** Session data to display */
  session: Session;
  /** Whether this session is currently active */
  isActive: boolean;
  /** Callback when session is selected */
  onSelect: () => void;
  /** Inline styles for virtual positioning */
  style?: React.CSSProperties;
  /** Show unsaved changes indicator */
  hasUnsavedChanges?: boolean;
  /** Callback when item receives focus (for keyboard navigation) */
  onFocus?: () => void;
}

/**
 * SessionListItem displays a single session in the virtualized list.
 *
 * Uses memo() per project-context.md (React 19 pattern).
 * CVA variants for default/selected states.
 */
export const SessionListItem = memo(function SessionListItem({
  session,
  isActive,
  onSelect,
  style,
  hasUnsavedChanges,
  onFocus,
}: SessionListItemProps) {
  return (
    <button
      aria-selected={isActive}
      className={cn(
        sessionItemVariants({ state: isActive ? "selected" : "default" })
      )}
      data-session-id={session.id}
      data-slot="session-list-item"
      onClick={onSelect}
      onFocus={onFocus}
      role="option"
      style={style}
      type="button"
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate" title={session.title}>
            {session.title.length > 50
              ? `${session.title.slice(0, 50)}...`
              : session.title}
          </span>
          {Boolean(hasUnsavedChanges) && (
            <span
              aria-label="Unsaved changes"
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              role="img"
            />
          )}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </span>
    </button>
  );
});
