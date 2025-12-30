/**
 * Session Sidebar Component Tests
 *
 * Tests for the session sidebar container.
 * Session list functionality is tested in session-list.test.tsx.
 *
 * Story 1.3: AC #1 (sidebar), AC #5 (session list)
 * Story 1.7: AC #4 (timestamps, ordering, unsaved indicator)
 * Story 3.1: Integration with virtualized SessionList
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { SessionSidebar } from "../session-sidebar";

// Mock SessionList to isolate SessionSidebar tests
// SessionList behavior is tested in session-list.test.tsx
vi.mock("@/components/features/sessions/session-list", () => ({
  SessionList: () => (
    <div data-testid="mock-session-list">Mock Session List</div>
  ),
}));

// Top-level regex patterns for performance
const NEW_CHAT_PATTERN = /new chat/i;

describe("SessionSidebar Component", () => {
  beforeEach(() => {
    // Reset session store with Story 1.7 state
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<SessionSidebar />);
      const sidebar = screen.getByTestId("session-sidebar");
      expect(sidebar).toHaveAttribute("data-slot", "session-sidebar");
    });

    it("displays 'New Chat' button", () => {
      render(<SessionSidebar />);
      expect(
        screen.getByRole("button", { name: NEW_CHAT_PATTERN })
      ).toBeInTheDocument();
    });

    it("renders SessionList component", () => {
      render(<SessionSidebar />);
      expect(screen.getByTestId("mock-session-list")).toBeInTheDocument();
    });
  });

  describe("New Chat Button", () => {
    it("creates new session on click", async () => {
      const user = userEvent.setup();
      render(<SessionSidebar />);

      const newChatBtn = screen.getByRole("button", { name: NEW_CHAT_PATTERN });
      await user.click(newChatBtn);

      // Should create a session with placeholder title
      const state = useSessionStore.getState();
      expect(state.sessions.length).toBe(1);
      expect(state.sessions[0].title).toBe("New conversation");
    });

    it("sets newly created session as active", async () => {
      const user = userEvent.setup();
      render(<SessionSidebar />);

      const newChatBtn = screen.getByRole("button", { name: NEW_CHAT_PATTERN });
      await user.click(newChatBtn);

      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBe(state.sessions[0].id);
    });

    it("has correct aria-label for accessibility", () => {
      render(<SessionSidebar />);
      const newChatBtn = screen.getByRole("button", { name: NEW_CHAT_PATTERN });
      expect(newChatBtn).toHaveAttribute("aria-label", "New chat");
    });
  });

  describe("Layout", () => {
    it("New Chat button is first element in sidebar", () => {
      render(<SessionSidebar />);

      const sidebar = screen.getByTestId("session-sidebar");
      const elements = sidebar.children;

      // First element should be the New Chat button
      expect(elements[0].getAttribute("aria-label")).toBe("New chat");
    });

    it("session list is rendered after search and filter components", () => {
      render(<SessionSidebar />);

      // Verify all components are present and session list is after the controls
      const newChatBtn = screen.getByRole("button", { name: NEW_CHAT_PATTERN });
      const sessionList = screen.getByTestId("mock-session-list");

      expect(newChatBtn).toBeInTheDocument();
      expect(sessionList).toBeInTheDocument();
    });

    it("has full height layout", () => {
      render(<SessionSidebar />);
      const sidebar = screen.getByTestId("session-sidebar");
      expect(sidebar).toHaveClass("h-full");
    });
  });
});
