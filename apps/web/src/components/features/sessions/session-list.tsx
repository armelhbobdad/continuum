"use client";

/**
 * Session List Component
 *
 * Virtualized session list using @tanstack/react-virtual.
 * Handles large session counts (1000+) with smooth scrolling.
 * Supports keyboard navigation (Arrow, Enter, Home/End).
 *
 * Story 3.1: Session History & Navigation
 * AC #1 (session list display), AC #2 (performance), AC #3 (selection), AC #4 (virtual scrolling)
 *
 * Story 3.2: Session Search & Filtering
 * Accepts filtered sessions with match ranges for search highlighting.
 *
 * NOTE: This component uses manual useMemo/useCallback despite React Compiler being enabled.
 * This is an intentional exception per project-context.md guidance for virtualized lists
 * handling 1000+ items where explicit memoization control is critical for 60fps scrolling.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FilteredSession } from "@/lib/sessions/filter-sessions";
import { useSessionStore } from "@/stores/session";
import { SessionListItem } from "./session-list-item";

/**
 * Ref interface for SessionList scroll control.
 * Used by SessionSidebar for scroll position restoration (Story 3.2 AC #5).
 */
export interface SessionListRef {
  /** Get current scroll position */
  getScrollPosition: () => number;
  /** Scroll to a specific position */
  scrollTo: (position: number) => void;
}

export interface SessionListProps {
  /** Filtered sessions to display (optional - falls back to store if not provided) */
  sessions?: FilteredSession[];
  /** Ref for scroll control (React 19 ref-as-prop pattern) */
  ref?: React.Ref<SessionListRef>;
}

/** Estimated height per session item in pixels */
const ITEM_HEIGHT = 56;
/** Number of items to render above/below viewport for smooth scrolling */
const OVERSCAN = 5;

/**
 * SessionList renders a virtualized list of chat sessions.
 *
 * Uses @tanstack/react-virtual for windowed rendering.
 * Per NFR8: Loads 100 sessions within 1 second.
 * Per NFR61: Supports 1000+ sessions with smooth scrolling.
 */
export function SessionList({
  sessions: filteredSessions,
  ref,
}: SessionListProps) {
  const storeSessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const isDirty = useSessionStore((state) => state.isDirty);

  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Expose scroll control methods via ref (Story 3.2 AC #5)
  useImperativeHandle(ref, () => ({
    getScrollPosition: () => parentRef.current?.scrollTop ?? 0,
    scrollTo: (position: number) => {
      parentRef.current?.scrollTo({ top: position });
    },
  }));

  // Use provided sessions or fall back to store sessions
  // When filtered sessions provided, they're already sorted
  // Type as FilteredSession[] since matchRanges is optional on that type
  const sortedSessions = useMemo((): FilteredSession[] => {
    if (filteredSessions) {
      return filteredSessions;
    }
    // Sort store sessions by updatedAt descending (most recent first)
    // Per Story 3.1 AC #1: ordered by last modified
    return [...storeSessions].sort((a, b) => {
      const aTime = a.updatedAt.getTime();
      const bTime = b.updatedAt.getTime();
      return bTime - aTime;
    });
  }, [filteredSessions, storeSessions]);

  const virtualizer = useVirtualizer({
    count: sortedSessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  /**
   * Focus a session item by index.
   * Uses setTimeout to ensure DOM is ready after state update.
   */
  const focusItemAtIndex = useCallback((index: number) => {
    setTimeout(() => {
      const buttons = parentRef.current?.querySelectorAll('[role="option"]');
      const button = buttons?.[index] as HTMLElement | undefined;
      button?.focus();
    }, 0);
  }, []);

  /**
   * Handle keyboard navigation.
   * Story 3.1 Task 3: Arrow keys, Enter, Home/End
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sortedSessions.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = Math.min(
            focusedIndex + 1,
            sortedSessions.length - 1
          );
          setFocusedIndex(nextIndex);
          focusItemAtIndex(nextIndex);
          // Scroll into view if needed
          virtualizer.scrollToIndex(nextIndex);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIndex);
          focusItemAtIndex(prevIndex);
          virtualizer.scrollToIndex(prevIndex);
          break;
        }
        case "Enter": {
          if (focusedIndex >= 0 && focusedIndex < sortedSessions.length) {
            const session = sortedSessions[focusedIndex];
            setActiveSession(session.id);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedIndex(0);
          focusItemAtIndex(0);
          virtualizer.scrollToIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          const lastIndex = sortedSessions.length - 1;
          setFocusedIndex(lastIndex);
          focusItemAtIndex(lastIndex);
          virtualizer.scrollToIndex(lastIndex);
          break;
        }
        default:
          // Other keys don't need handling
          break;
      }
    },
    [
      sortedSessions,
      focusedIndex,
      setActiveSession,
      focusItemAtIndex,
      virtualizer,
    ]
  );

  /**
   * Handle item focus to sync focusedIndex state.
   */
  const handleItemFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  // Handle empty state
  if (sortedSessions.length === 0) {
    return (
      <div
        aria-label="Chat sessions"
        className="flex-1 overflow-y-auto"
        data-slot="session-list"
        ref={parentRef}
        role="listbox"
      >
        <div className="p-2 text-center text-muted-foreground text-sm">
          No conversations yet
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Chat sessions"
      className="flex-1 overflow-y-auto"
      data-slot="session-list"
      onKeyDown={handleKeyDown}
      ref={parentRef}
      role="listbox"
      tabIndex={0}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const session = sortedSessions[virtualRow.index];
          const isActive = session.id === activeSessionId;
          // Show unsaved indicator only for active session when dirty
          const hasUnsavedChanges = isActive && isDirty;

          return (
            <SessionListItem
              hasUnsavedChanges={hasUnsavedChanges}
              isActive={isActive}
              key={session.id}
              matchRanges={session.matchRanges}
              onFocus={() => handleItemFocus(virtualRow.index)}
              onSelect={() => setActiveSession(session.id)}
              session={session}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
