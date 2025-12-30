"use client";

/**
 * Session Sidebar Component
 *
 * Container for session management with New Chat button and session list.
 * Delegates to SessionList for virtualized rendering.
 *
 * Story 1.3: Basic Chat UI Shell
 * Story 1.7: Session Persistence & Auto-Save
 * Story 3.1: Session History & Navigation (virtualized list)
 * AC #4 (session list display with timestamps)
 */

import { useCallback } from "react";
import { SessionList } from "@/components/features/sessions/session-list";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";

/**
 * Session Sidebar Component
 *
 * Shows New Chat button and virtualized session list.
 * Session list handles keyboard navigation and virtual scrolling.
 */
export function SessionSidebar() {
  const createSession = useSessionStore((state) => state.createSession);

  const handleNewChat = useCallback(() => {
    createSession("New conversation");
  }, [createSession]);

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

      {/* Virtualized Session List (Story 3.1) */}
      <SessionList />
    </div>
  );
}
