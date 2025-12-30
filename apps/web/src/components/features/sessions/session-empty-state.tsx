"use client";

/**
 * Session Empty State Component
 *
 * Displays helpful message when no sessions match search/filters.
 *
 * Story 3.2: Session Search & Filtering
 * AC #4 (empty search state)
 * Task 5.4
 */

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface SessionEmptyStateProps {
  /** Current search query (if any) */
  searchQuery?: string;
  /** Callback to clear the search */
  onClearSearch?: () => void;
}

/**
 * SessionEmptyState displays a message when no sessions are found.
 *
 * Shows different messages based on:
 * - Search is active with no results → Show clear search option
 * - No sessions exist → Show "No conversations yet"
 */
export function SessionEmptyState({
  searchQuery,
  onClearSearch,
}: SessionEmptyStateProps) {
  if (searchQuery) {
    return (
      <div
        className="flex flex-col items-center justify-center p-4 text-center"
        data-slot="session-empty-state"
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="mb-2 h-8 w-8 text-muted-foreground"
          icon={Search01Icon}
          size={32}
        />
        <p className="text-muted-foreground text-sm">
          No sessions match "{searchQuery}"
        </p>
        {onClearSearch && (
          <button
            className="mt-2 text-primary text-sm hover:underline"
            onClick={onClearSearch}
            type="button"
          >
            Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-4 text-center"
      data-slot="session-empty-state"
    >
      <p className="text-muted-foreground text-sm">No conversations yet</p>
    </div>
  );
}
