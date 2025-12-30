"use client";

/**
 * Session Filters Component
 *
 * Collapsible filter panel with date range and message type filters.
 *
 * Story 3.2: Session Search & Filtering
 * AC #3 (session filters)
 * Task 2: Subtasks 2.1-2.7
 */

import { PreferenceHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useState } from "react";
import {
  countActiveFilters,
  type SessionFilterOptions,
} from "@/lib/sessions/filter-sessions";
import { cn } from "@/lib/utils";

export interface SessionFiltersProps {
  /** Current filter values */
  filters: SessionFilterOptions;
  /** Callback when filters change */
  onFiltersChange: (filters: SessionFilterOptions) => void;
}

/**
 * Get date range based on preset selection.
 */
function getDateRangeFromPreset(
  preset: string
): { start: Date; end: Date } | undefined {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay };
    }
    default:
      return undefined;
  }
}

/**
 * SessionFilters provides a collapsible filter panel.
 *
 * Features:
 * - Toggle button with active filter count badge
 * - Date range presets (Today, This Week, This Month)
 * - Message type filter (All, With AI, User only)
 * - Clear all filters button
 */
export function SessionFilters({
  filters,
  onFiltersChange,
}: SessionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Track selected date range preset for controlled select value
  const [dateRangePreset, setDateRangePreset] = useState("");
  const activeCount = countActiveFilters(filters);

  // Sync date range preset when filters are cleared externally
  if (!filters.dateRange && dateRangePreset !== "") {
    setDateRangePreset("");
  }

  // Task 2.3: Date range filter handler
  const handleDateRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const preset = e.target.value;
      setDateRangePreset(preset);
      const dateRange = getDateRangeFromPreset(preset);
      onFiltersChange({ ...filters, dateRange });
    },
    [filters, onFiltersChange]
  );

  // Task 2.5: Message type filter handler
  const handleMessageTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const messageType = e.target.value as SessionFilterOptions["messageType"];
      onFiltersChange({ ...filters, messageType });
    },
    [filters, onFiltersChange]
  );

  // Task 2.6: Clear all filters
  const handleClearFilters = useCallback(() => {
    setDateRangePreset("");
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className="px-2" data-slot="session-filters">
      {/* Task 2.2: Toggle button with filter icon */}
      <button
        aria-expanded={isExpanded}
        aria-label={`Filters${activeCount > 0 ? ` (${activeCount} active)` : ""}`}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
          "hover:bg-muted",
          isExpanded && "bg-muted"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <HugeiconsIcon
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
            icon={PreferenceHorizontalIcon}
            size={16}
          />
          <span>Filters</span>
        </span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
            {activeCount}
          </span>
        )}
      </button>

      {/* Task 2.2: Collapsible filter panel - using fieldset for semantics */}
      {isExpanded && (
        <fieldset
          aria-label="Filter options"
          className="mt-2 space-y-3 rounded-lg border border-border bg-background p-3"
        >
          {/* Task 2.3: Date range filter */}
          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="date-range-filter"
            >
              Date range
            </label>
            <select
              aria-label="Date range"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              id="date-range-filter"
              onChange={handleDateRangeChange}
              value={dateRangePreset}
            >
              <option value="">Any time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Task 2.5: Message type filter */}
          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="message-type-filter"
            >
              Message type
            </label>
            <select
              aria-label="Message type"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              id="message-type-filter"
              onChange={handleMessageTypeChange}
              value={filters.messageType || "all"}
            >
              <option value="all">All</option>
              <option value="with-ai">With AI responses</option>
              <option value="user-only">User messages only</option>
            </select>
          </div>

          {/* Task 2.6: Clear filters button */}
          {activeCount > 0 && (
            <button
              aria-label="Clear filters"
              className="w-full rounded-md border border-border px-2 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleClearFilters}
              type="button"
            >
              Clear filters
            </button>
          )}
        </fieldset>
      )}
    </div>
  );
}
