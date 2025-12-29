"use client";

/**
 * Session Sidebar Component
 *
 * Displays list of chat sessions for navigation.
 * Shows sessions sorted by recency with relative timestamps.
 * Supports keyboard navigation.
 *
 * Story 1.3: Basic Chat UI Shell
 * Story 1.7: Session Persistence & Auto-Save
 * AC #4 (session list display with timestamps)
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session";

/**
 * Session Sidebar Component
 *
 * Shows session list with new chat button.
 * Keyboard navigation (arrow keys, Enter) support.
 * Displays relative timestamps and sorts by recency.
 */
export function SessionSidebar() {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const createSession = useSessionStore((state) => state.createSession);
  const isDirty = useSessionStore((state) => state.isDirty);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Sort sessions by updatedAt descending (most recent first)
  // Story 1.7 Task 4.3: Sort sessions by recency
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const aTime = a.updatedAt.getTime();
        const bTime = b.updatedAt.getTime();
        return bTime - aTime;
      }),
    [sessions]
  );

  const handleNewChat = useCallback(() => {
    createSession("New conversation");
  }, [createSession]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);
    },
    [setActiveSession]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sortedSessions.length === 0) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < sortedSessions.length - 1 ? prev + 1 : prev;
            // Focus the button at the new index
            const buttons =
              listRef.current?.querySelectorAll('[role="option"]');
            (buttons?.[next] as HTMLElement)?.focus();
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : 0;
            const buttons =
              listRef.current?.querySelectorAll('[role="option"]');
            (buttons?.[next] as HTMLElement)?.focus();
            return next;
          });
          break;
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < sortedSessions.length) {
            handleSelectSession(sortedSessions[focusedIndex].id);
          }
          break;
        default:
          // Other keys don't need special handling
          break;
      }
    },
    [sortedSessions, focusedIndex, handleSelectSession]
  );

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

      {/* Session List */}
      <div
        aria-label="Chat sessions"
        className="flex-1 overflow-y-auto"
        onKeyDown={handleKeyDown}
        ref={listRef}
        role="listbox"
        tabIndex={0}
      >
        {sortedSessions.length === 0 ? (
          <div className="p-2 text-center text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          sortedSessions.map((session, index) => {
            const isActive = session.id === activeSessionId;
            // Story 1.7 Task 4.4: Show unsaved indicator for active session when dirty
            const hasUnsavedChanges = isActive && isDirty;

            return (
              <button
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg p-2 text-left text-sm transition-colors",
                  "hover:bg-muted focus:bg-muted focus:outline-none",
                  isActive && "bg-muted font-medium"
                )}
                data-slot="session-sidebar-item"
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                onFocus={() => setFocusedIndex(index)}
                role="option"
                type="button"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate">{session.title}</span>
                    {/* Story 1.7 Task 4.4: Unsaved changes indicator */}
                    {Boolean(hasUnsavedChanges) && (
                      <span
                        aria-label="Unsaved changes"
                        className="h-1.5 w-1.5 rounded-full bg-amber-500"
                        role="img"
                        title="Unsaved changes"
                      />
                    )}
                  </span>
                  {/* Story 1.7 Task 4.2: Relative timestamp */}
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(session.updatedAt)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
