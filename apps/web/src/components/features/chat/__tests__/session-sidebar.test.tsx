/**
 * Session Sidebar Component Tests
 *
 * Tests for session sidebar navigation and display.
 * Story 1.3: AC #1 (sidebar), AC #5 (session list)
 * Story 1.7: AC #4 (timestamps, ordering, unsaved indicator)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { SessionSidebar } from "../session-sidebar";

// Top-level regex patterns for performance
const NEW_CHAT_PATTERN = /new chat/i;
const NO_CONVERSATIONS_PATTERN = /no conversations/i;
const ACTIVE_SESSION_PATTERN = /active session/i;
const FIRST_SESSION_PATTERN = /first session/i;
const TEST_SESSION_PATTERN = /test session/i;
const VERY_LONG_TITLE_PATTERN =
  /This is a very long session title that should be/;
const JUST_NOW_PATTERN = /just now/i;
const FIVE_MIN_AGO_PATTERN = /5 min ago/i;

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
      expect(screen.getByText(VERY_LONG_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("shows empty state when no sessions", () => {
      render(<SessionSidebar />);
      expect(screen.getByText(NO_CONVERSATIONS_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Active Session (AC #5)", () => {
    it("highlights active session", () => {
      const state = useSessionStore.getState();
      state.createSession("Active session");

      render(<SessionSidebar />);

      const activeItem = screen.getByRole("option", {
        name: ACTIVE_SESSION_PATTERN,
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
        name: FIRST_SESSION_PATTERN,
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

      const newChatBtn = screen.getByRole("button", { name: NEW_CHAT_PATTERN });
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
        name: FIRST_SESSION_PATTERN,
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
      const option = screen.getByRole("option", { name: TEST_SESSION_PATTERN });
      expect(option).toBeInTheDocument();
    });
  });

  // Story 1.7: Session Persistence & Auto-Save
  describe("Relative Timestamps (Story 1.7 Task 4.2)", () => {
    it("displays relative timestamp for each session", () => {
      const state = useSessionStore.getState();
      state.createSession("Test session");

      render(<SessionSidebar />);

      // Should show "just now" for recently created session
      expect(screen.getByText(JUST_NOW_PATTERN)).toBeInTheDocument();
    });

    it("displays appropriate time format for older sessions", () => {
      // Create session with older timestamp
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 5);

      useSessionStore.setState({
        sessions: [
          {
            id: "old-session",
            title: "Old session",
            messages: [],
            createdAt: oldDate,
            updatedAt: oldDate,
          },
        ],
        activeSessionId: "old-session",
      });

      render(<SessionSidebar />);

      // Should show "5 min ago"
      expect(screen.getByText(FIVE_MIN_AGO_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Session Ordering (Story 1.7 Task 4.3)", () => {
    it("sorts sessions by updatedAt descending", () => {
      // Create sessions with different timestamps
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 2);

      const recentDate = new Date();

      useSessionStore.setState({
        sessions: [
          {
            id: "old",
            title: "Old session",
            messages: [],
            createdAt: oldDate,
            updatedAt: oldDate,
          },
          {
            id: "recent",
            title: "Recent session",
            messages: [],
            createdAt: recentDate,
            updatedAt: recentDate,
          },
        ],
        activeSessionId: "recent",
      });

      render(<SessionSidebar />);

      const items = screen.getAllByRole("option");
      // Recent should come first
      expect(items[0]).toHaveTextContent("Recent session");
      expect(items[1]).toHaveTextContent("Old session");
    });
  });

  describe("Unsaved Changes Indicator (Story 1.7 Task 4.4)", () => {
    it("shows unsaved indicator for active session when dirty", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test session");

      // Set dirty state
      useSessionStore.setState({
        activeSessionId: sessionId,
        isDirty: true,
      });

      render(<SessionSidebar />);

      // Should show unsaved indicator
      const indicator = screen.getByLabelText("Unsaved changes");
      expect(indicator).toBeInTheDocument();
    });

    it("does not show unsaved indicator when not dirty", () => {
      const state = useSessionStore.getState();
      state.createSession("Test session");

      // Clear dirty flag (createSession sets it to true)
      useSessionStore.setState({ isDirty: false });

      render(<SessionSidebar />);

      // Should not show unsaved indicator
      expect(
        screen.queryByLabelText("Unsaved changes")
      ).not.toBeInTheDocument();
    });

    it("does not show unsaved indicator for inactive sessions even when dirty", () => {
      // Create two sessions
      useSessionStore.setState({
        sessions: [
          {
            id: "inactive",
            title: "Inactive session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "active",
            title: "Active session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        activeSessionId: "active",
        isDirty: true,
      });

      render(<SessionSidebar />);

      // Only one unsaved indicator (for active session)
      const indicators = screen.queryAllByLabelText("Unsaved changes");
      expect(indicators).toHaveLength(1);
    });
  });

  describe("Session Item Styling (Story 1.7)", () => {
    it("has data-slot attribute on session items", () => {
      const state = useSessionStore.getState();
      state.createSession("Test session");

      render(<SessionSidebar />);

      const item = screen.getByRole("option", { name: TEST_SESSION_PATTERN });
      expect(item).toHaveAttribute("data-slot", "session-sidebar-item");
    });
  });
});
