"use client";

/**
 * Session List Item Component
 *
 * Individual session item with CVA variants for virtualized list.
 * Displays session title, relative timestamp, and unsaved indicator.
 * Supports search result highlighting via matchRanges prop.
 *
 * Story 3.1: Session History & Navigation
 * Story 3.2: Session Search & Filtering (highlight support)
 * AC #1 (session display), AC #3 (session selection)
 */

import { cva, type VariantProps } from "class-variance-authority";
import { memo } from "react";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { MatchRange } from "@/lib/sessions/filter-sessions";
import { cn } from "@/lib/utils";
import type { Session } from "@/stores/session";
import { HighlightText } from "./highlight-text";
import { SessionActions } from "./session-actions";

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
  /** Match ranges for search highlighting (Story 3.2) */
  matchRanges?: MatchRange[];
  /** Callback to delete session (Story 3.3) */
  onDelete?: () => void;
  /** Callback to export session as JSON (Story 3.3) */
  onExportJson?: () => void;
  /** Callback to export session as Markdown (Story 3.3) */
  onExportMarkdown?: () => void;
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
  matchRanges,
  onDelete,
  onExportJson,
  onExportMarkdown,
}: SessionListItemProps) {
  // Truncate title to 50 chars per Story 3.1 spec
  const displayTitle =
    session.title.length > 50
      ? `${session.title.slice(0, 50)}...`
      : session.title;

  // Adjust match ranges for truncated title
  // Filter ranges that start within visible text and clamp end to displayTitle length
  const adjustedRanges =
    matchRanges
      ?.filter((r) => r.start < displayTitle.length)
      .map((r) => ({
        start: r.start,
        end: Math.min(r.end, displayTitle.length),
      })) ?? [];

  // Show actions when any action handler is provided
  const hasActions = onDelete || onExportJson || onExportMarkdown;

  // Handle keyboard activation for div-based option
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      aria-selected={isActive}
      className={cn(
        sessionItemVariants({ state: isActive ? "selected" : "default" }),
        hasActions && "group"
      )}
      data-session-id={session.id}
      data-slot="session-list-item"
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      role="option"
      style={style}
      tabIndex={0}
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate" title={session.title}>
            {adjustedRanges.length > 0 ? (
              <HighlightText ranges={adjustedRanges} text={displayTitle} />
            ) : (
              displayTitle
            )}
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
      {hasActions && onDelete && onExportJson && onExportMarkdown && (
        <SessionActions
          onDelete={onDelete}
          onExportJson={onExportJson}
          onExportMarkdown={onExportMarkdown}
          session={session}
        />
      )}
    </div>
  );
});
