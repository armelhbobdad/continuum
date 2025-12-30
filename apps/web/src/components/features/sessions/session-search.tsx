"use client";

/**
 * Session Search Component
 *
 * Search input with debounced query and clear functionality.
 * Uses CVA for state variants (default/filled).
 *
 * Story 3.2: Session Search & Filtering
 * AC #1 (session search), AC #5 (search reset)
 * Task 1: Subtasks 1.1-1.7
 */

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * CVA variants for search input states.
 * Per project-context.md: Use CVA for component variants.
 * Task 1.7: Style with CVA variants for focus/filled states
 */
const searchInputVariants = cva(
  "w-full rounded-lg border bg-background px-3 py-2 pl-9 text-sm transition-colors",
  {
    variants: {
      state: {
        default:
          "border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        filled: "border-primary/50",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

export interface SessionSearchProps {
  /** Callback when search query changes (debounced) */
  onSearch: (query: string) => void;
  /** Number of results found (for accessibility) */
  resultCount?: number;
  /** Optional callback when search is cleared (for scroll position restore) */
  onClearSearch?: () => void;
}

/**
 * SessionSearch provides a debounced search input for filtering sessions.
 *
 * Features:
 * - 300ms debounce to prevent excessive filtering
 * - Escape key to clear search
 * - Clear button when input has value
 * - ARIA attributes for accessibility
 * - CVA variants for visual states
 */
export function SessionSearch({
  onSearch,
  resultCount,
  onClearSearch,
}: SessionSearchProps) {
  const [query, setQuery] = useState("");

  // Task 1.3: Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Task 1.6: Handle clear (Escape key or button click)
  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
    onClearSearch?.();
  }, [onSearch, onClearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [handleClear]
  );

  return (
    <div className="relative px-2 py-2" data-slot="session-search">
      {/* Task 1.2: Search icon */}
      <HugeiconsIcon
        aria-hidden="true"
        className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        icon={Search01Icon}
        size={16}
      />
      {/* Task 1.5: ARIA attributes - type="search" implies searchbox role */}
      <input
        aria-describedby={
          resultCount !== undefined ? "search-result-count" : undefined
        }
        aria-label="Search sessions"
        className={cn(
          searchInputVariants({ state: query ? "filled" : "default" })
        )}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search sessions..."
        type="search"
        value={query}
      />
      {/* Task 1.2: Clear button (Cancel01Icon) */}
      {query && (
        <button
          aria-label="Clear search"
          className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          type="button"
        >
          <HugeiconsIcon className="h-4 w-4" icon={Cancel01Icon} size={16} />
        </button>
      )}
      {/* Task 1.5: Result count for screen readers with live region */}
      {resultCount !== undefined && (
        <span aria-live="polite" className="sr-only" id="search-result-count">
          {resultCount} {resultCount === 1 ? "result" : "results"} found
        </span>
      )}
    </div>
  );
}
