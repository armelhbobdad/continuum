"use client";

/**
 * Session Sidebar Component
 *
 * Container for session management with New Chat button, search, filters, and session list.
 * Delegates to SessionList for virtualized rendering.
 *
 * Story 1.3: Basic Chat UI Shell
 * Story 1.7: Session Persistence & Auto-Save
 * Story 3.1: Session History & Navigation (virtualized list)
 * Story 3.2: Session Search & Filtering
 * AC #4 (session list display with timestamps)
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { SessionEmptyState } from "@/components/features/sessions/session-empty-state";
import { SessionFilters } from "@/components/features/sessions/session-filters";
import {
  SessionList,
  type SessionListRef,
} from "@/components/features/sessions/session-list";
import { SessionSearch } from "@/components/features/sessions/session-search";
import { Button } from "@/components/ui/button";
import {
  filterSessions,
  type SessionFilterOptions,
} from "@/lib/sessions/filter-sessions";
import { useSessionStore } from "@/stores/session";

/**
 * Session Sidebar Component
 *
 * Shows New Chat button, search, filters, and virtualized session list.
 * Session list handles keyboard navigation and virtual scrolling.
 */
export function SessionSidebar() {
  const createSession = useSessionStore((state) => state.createSession);
  const sessions = useSessionStore((state) => state.sessions);

  // Search state - not persisted per Story 3.2 privacy requirement
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SessionFilterOptions>({});

  // Scroll position restoration (Story 3.2 AC #5)
  const sessionListRef = useRef<SessionListRef>(null);
  const savedScrollPositionRef = useRef<number>(0);

  const handleNewChat = useCallback(() => {
    createSession("New conversation");
  }, [createSession]);

  // Filter and sort sessions
  // Sort by updatedAt descending, then apply filters
  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const aTime = a.updatedAt.getTime();
      const bTime = b.updatedAt.getTime();
      return bTime - aTime;
    });
    return filterSessions(sorted, { ...filters, query: searchQuery });
  }, [sessions, filters, searchQuery]);

  // Handle search - callback for debounced search component
  // Save scroll position when search starts
  const handleSearch = useCallback(
    (query: string) => {
      // Save scroll position when starting a new search
      if (searchQuery === "" && query !== "") {
        savedScrollPositionRef.current =
          sessionListRef.current?.getScrollPosition() ?? 0;
      }
      setSearchQuery(query);
    },
    [searchQuery]
  );

  // Clear search and restore scroll position (Story 3.2 AC #5)
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    // Restore scroll position after React re-renders with full list
    requestAnimationFrame(() => {
      sessionListRef.current?.scrollTo(savedScrollPositionRef.current);
    });
  }, []);

  // Determine if we're in search/filter mode
  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasActiveFilters =
    filters.dateRange !== undefined ||
    (filters.messageType !== undefined && filters.messageType !== "all");
  const showEmptyState =
    filteredSessions.length === 0 && (hasActiveSearch || hasActiveFilters);

  return (
    <div
      className="flex h-full flex-col p-2"
      data-slot="session-sidebar"
      data-testid="session-sidebar"
    >
      {/* New Chat Button */}
      <Button
        aria-label="New chat"
        className="mb-2 w-full justify-start"
        onClick={handleNewChat}
        variant="outline"
      >
        New Chat
      </Button>

      {/* Search Input (Story 3.2) */}
      <SessionSearch
        onClearSearch={handleClearSearch}
        onSearch={handleSearch}
        resultCount={hasActiveSearch ? filteredSessions.length : undefined}
      />

      {/* Filters (Story 3.2) */}
      <SessionFilters filters={filters} onFiltersChange={setFilters} />

      {/* Empty State or Session List */}
      {showEmptyState ? (
        <SessionEmptyState
          onClearSearch={handleClearSearch}
          searchQuery={searchQuery}
        />
      ) : (
        <SessionList ref={sessionListRef} sessions={filteredSessions} />
      )}
    </div>
  );
}
