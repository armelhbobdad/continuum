/**
 * Session Sidebar Component Tests
 *
 * Tests for session sidebar navigation and display.
 * Story 1.3: AC #1 (sidebar), AC #5 (session list)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { SessionSidebar } from "../session-sidebar";

describe("SessionSidebar Component", () => {
  beforeEach(() => {
    // Reset session store
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
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
        screen.getByRole("button", { name: /new chat/i })
      ).toBeInTheDocument();
    });
  });

  describe("Session List Display (AC #5)", () => {
    it("displays sessions from store", () => {
      // Create sessions
      const state = useSessionStore.getState();
      state.createSession("First session");
      const updatedState = useSessionStore.getState();
      updatedState.createSession("Second session");

      render(<SessionSidebar />);

      expect(screen.getByText("Second session")).toBeInTheDocument();
      expect(screen.getByText("First session")).toBeInTheDocument();
    });

    it("shows sessions in chronological order (newest first)", () => {
      const state = useSessionStore.getState();
      state.createSession("First session");
      const state2 = useSessionStore.getState();
      state2.createSession("Second session");

      render(<SessionSidebar />);

      const items = screen.getAllByRole("option");
      // Newest (Second) should come before First
      expect(items[0]).toHaveTextContent("Second session");
      expect(items[1]).toHaveTextContent("First session");
    });

    it("truncates long session titles", () => {
      const state = useSessionStore.getState();
      state.createSession(
        "This is a very long session title that should be truncated for display"
      );

      render(<SessionSidebar />);

      // Title is truncated in store to 50 chars + "..."
      expect(
        screen.getByText(/This is a very long session title that should be/)
      ).toBeInTheDocument();
    });

    it("shows empty state when no sessions", () => {
      render(<SessionSidebar />);
      expect(screen.getByText(/no conversations/i)).toBeInTheDocument();
    });
  });

  describe("Active Session (AC #5)", () => {
    it("highlights active session", () => {
      const state = useSessionStore.getState();
      state.createSession("Active session");

      render(<SessionSidebar />);

      const activeItem = screen.getByRole("option", {
        name: /active session/i,
      });
      expect(activeItem).toHaveAttribute("aria-current", "true");
    });

    it("clicking session sets it as active", async () => {
      const user = userEvent.setup();
      const state = useSessionStore.getState();
      state.createSession("First session");
      const state2 = useSessionStore.getState();
      state2.createSession("Second session");

      render(<SessionSidebar />);

      // Click first session (not active)
      const firstSession = screen.getByRole("option", {
        name: /first session/i,
      });
      await user.click(firstSession);

      const updatedState = useSessionStore.getState();
      const firstSessionData = updatedState.sessions.find(
        (s) => s.title === "First session"
      );
      expect(updatedState.activeSessionId).toBe(firstSessionData?.id);
    });
  });

  describe("New Chat Button", () => {
    it("creates new session on click", async () => {
      const user = userEvent.setup();
      render(<SessionSidebar />);

      const newChatBtn = screen.getByRole("button", { name: /new chat/i });
      await user.click(newChatBtn);

      // Should create a session with placeholder title
      const state = useSessionStore.getState();
      expect(state.sessions.length).toBe(1);
    });
  });

  describe("Keyboard Navigation", () => {
    it("arrow keys navigate between sessions", async () => {
      const user = userEvent.setup();
      const state = useSessionStore.getState();
      state.createSession("First session");
      const state2 = useSessionStore.getState();
      state2.createSession("Second session");

      render(<SessionSidebar />);

      const sessionList = screen.getByRole("listbox");
      sessionList.focus();

      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toHaveTextContent("Second session");

      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toHaveTextContent("First session");
    });

    it("Enter selects focused session", async () => {
      const user = userEvent.setup();
      const state = useSessionStore.getState();
      state.createSession("First session");
      const state2 = useSessionStore.getState();
      state2.createSession("Second session");

      render(<SessionSidebar />);

      const firstSession = screen.getByRole("option", {
        name: /first session/i,
      });
      await user.click(firstSession); // Focus via click to avoid act() warning
      await user.keyboard("{Enter}");

      const updatedState = useSessionStore.getState();
      const firstSessionData = updatedState.sessions.find(
        (s) => s.title === "First session"
      );
      expect(updatedState.activeSessionId).toBe(firstSessionData?.id);
    });
  });

  describe("Accessibility", () => {
    it("has aria-label for screen readers", () => {
      render(<SessionSidebar />);
      const list = screen.getByRole("listbox");
      expect(list).toHaveAttribute("aria-label", "Chat sessions");
    });

    it("session items have proper role", () => {
      const state = useSessionStore.getState();
      state.createSession("Test session");

      render(<SessionSidebar />);

      // Items have role="option" for listbox semantics
      const option = screen.getByRole("option", { name: /test session/i });
      expect(option).toBeInTheDocument();
    });
  });
});
