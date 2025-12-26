"use client";

/**
 * Session Sidebar Component
 *
 * Displays list of chat sessions for navigation.
 * Shows sessions chronologically (newest first).
 * Supports keyboard navigation.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #1 (sidebar visibility), AC #5 (session list)
 */

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session";

/**
 * Session Sidebar Component
 *
 * Shows session list with new chat button.
 * Keyboard navigation (arrow keys, Enter) support.
 */
export function SessionSidebar() {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const createSession = useSessionStore((state) => state.createSession);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

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
      if (sessions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < sessions.length - 1 ? prev + 1 : prev;
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
          if (focusedIndex >= 0 && focusedIndex < sessions.length) {
            handleSelectSession(sessions[focusedIndex].id);
          }
          break;
      }
    },
    [sessions, focusedIndex, handleSelectSession]
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
        {sessions.length === 0 ? (
          <div className="p-2 text-center text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          sessions.map((session, index) => (
            <button
              aria-current={session.id === activeSessionId ? "true" : undefined}
              className={cn(
                "flex w-full cursor-pointer items-center rounded-lg p-2 text-left text-sm transition-colors",
                "hover:bg-muted focus:bg-muted focus:outline-none",
                session.id === activeSessionId && "bg-muted font-medium"
              )}
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              onFocus={() => setFocusedIndex(index)}
              role="option"
              type="button"
            >
              <span className="truncate">{session.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
