"use client";

/**
 * Chat Layout Component
 *
 * Main layout for chat interface with sidebar and chat panel.
 * Sidebar: 280px on desktop, toggleable sheet on mobile.
 * Main: flex-1 remaining space.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #1: Main view layout with chat panel and sidebar
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./chat-panel";
import { SessionSidebar } from "./session-sidebar";

/**
 * Chat Layout Component
 *
 * Grid layout: Sidebar (280px fixed) + Main (flex-1).
 * Responsive: Sidebar as overlay sheet on mobile, visible on lg breakpoint.
 */
export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="relative flex h-[calc(100vh-48px)]"
      data-slot="chat-layout"
      data-testid="chat-layout"
    >
      {/* Mobile sidebar toggle button */}
      <Button
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Close sessions" : "Open sessions"}
        className="absolute top-2 left-2 z-20 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        size="sm"
        variant="outline"
      >
        {sidebarOpen ? "Close" : "Sessions"}
      </Button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-10 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: 280px fixed width, overlay on mobile */}
      <aside
        aria-label="Chat sessions"
        className={`absolute inset-y-0 left-0 z-10 w-70 border-r bg-background transition-transform duration-200 lg:relative lg:flex lg:translate-x-0 lg:flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SessionSidebar />
      </aside>

      {/* Main: flex-1 remaining space */}
      <main
        aria-label="Chat messages"
        className="flex min-w-0 flex-1 flex-col pt-12 lg:pt-0"
      >
        <ChatPanel />
      </main>
    </div>
  );
}
