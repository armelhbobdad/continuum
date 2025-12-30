/**
 * SessionList Component Tests
 *
 * Tests for virtualized session list with @tanstack/react-virtual.
 * Story 3.1: Session History & Navigation
 * AC #1 (session list display), AC #2 (performance), AC #4 (virtual scrolling)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/stores/session";
import { useSessionStore } from "@/stores/session";
import { SessionList } from "../session-list";

// Mock @tanstack/react-virtual for deterministic tests
// Uses a simplified mock that renders up to 20 items for testing
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        start: i * estimateSize(),
        size: estimateSize(),
        key: i,
      })),
    getTotalSize: () => count * estimateSize(),
    scrollToIndex: vi.fn(),
  }),
}));

// Top-level regex patterns for performance
const NO_CONVERSATIONS_PATTERN = /no conversations/i;
const SESSION_1_PATTERN = /Session 1/i;
const SESSION_2_PATTERN = /Session 2/i;
const JUST_NOW_PATTERN = /just now/i;
const CHAT_SESSIONS_LABEL = "Chat sessions";

/**
 * Generate mock sessions for testing
 */
function generateMockSessions(count: number): Session[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    title: `Session ${i + 1}`,
    messages: [],
    createdAt: new Date(Date.now() - i * 60_000), // Each 1 minute older
    updatedAt: new Date(Date.now() - i * 60_000),
  }));
}

describe("SessionList Component", () => {
  beforeEach(() => {
    // Reset session store
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  describe("Rendering (AC #1)", () => {
    it("renders with data-slot attribute", () => {
      render(<SessionList />);
      const list = screen.getByRole("listbox");
      expect(list).toHaveAttribute("data-slot", "session-list");
    });

    it("has proper aria-label for screen readers", () => {
      render(<SessionList />);
      const list = screen.getByRole("listbox");
      expect(list).toHaveAttribute("aria-label", CHAT_SESSIONS_LABEL);
    });
  });

  describe("Session Display (AC #1)", () => {
    it("displays sessions from store", () => {
      const sessions = generateMockSessions(3);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      expect(screen.getByText("Session 1")).toBeInTheDocument();
      expect(screen.getByText("Session 2")).toBeInTheDocument();
      expect(screen.getByText("Session 3")).toBeInTheDocument();
    });

    it("shows sessions sorted by most recent first", () => {
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

      render(<SessionList />);

      const items = screen.getAllByRole("option");
      // Recent should come first
      expect(items[0]).toHaveTextContent("Recent session");
      expect(items[1]).toHaveTextContent("Old session");
    });

    it("shows relative timestamp for each session", () => {
      const sessions = generateMockSessions(1);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      // Should show "just now" for recently created session
      expect(screen.getByText(JUST_NOW_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Empty State (AC #1)", () => {
    it("displays empty state when no sessions", () => {
      render(<SessionList />);
      expect(screen.getByText(NO_CONVERSATIONS_PATTERN)).toBeInTheDocument();
    });

    it("shows session list container even when empty", () => {
      render(<SessionList />);
      // Empty state still has the container
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("Session Selection (AC #3)", () => {
    it("highlights active session", () => {
      const sessions = generateMockSessions(2);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const activeItem = screen.getByRole("option", {
        name: SESSION_1_PATTERN,
      });
      expect(activeItem).toHaveAttribute("aria-selected", "true");
    });

    it("clicking session calls onSelect handler", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(2);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      // Click non-active session
      const session2 = screen.getByRole("option", { name: SESSION_2_PATTERN });
      await user.click(session2);

      // Store should update
      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBe("session-1");
    });
  });

  describe("Virtual Scrolling (AC #4)", () => {
    it("renders only visible items for large lists", () => {
      const sessions = generateMockSessions(1000);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      // Virtual list should not render all 1000
      const renderedItems = screen.getAllByRole("option");
      expect(renderedItems.length).toBeLessThan(50);
    });

    it("uses position:absolute for virtual items", () => {
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const items = screen.getAllByRole("option");
      // Check first item has positioning styles
      expect(items[0]).toHaveStyle({ position: "absolute" });
    });

    it("maintains stable keys for virtual items", () => {
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const items = screen.getAllByRole("option");
      // Each item should have unique session.id as key (reflected in data-session-id)
      const ids = items.map((item) => item.getAttribute("data-session-id"));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(items.length);
    });
  });

  describe("Accessibility", () => {
    it("session items have role='option'", () => {
      const sessions = generateMockSessions(2);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const items = screen.getAllByRole("option");
      expect(items.length).toBe(2);
    });

    it("container has role='listbox'", () => {
      render(<SessionList />);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("active session has aria-selected='true'", () => {
      const sessions = generateMockSessions(2);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const activeItem = screen.getByRole("option", {
        name: SESSION_1_PATTERN,
      });
      expect(activeItem).toHaveAttribute("aria-selected", "true");

      const inactiveItem = screen.getByRole("option", {
        name: SESSION_2_PATTERN,
      });
      expect(inactiveItem).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("Performance (AC #2)", () => {
    it("renders within performance budget for 100 sessions", () => {
      const sessions = generateMockSessions(100);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      const startTime = performance.now();
      render(<SessionList />);
      const endTime = performance.now();

      // Should render in <1000ms per NFR8
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("handles 1000+ sessions without crashing", () => {
      const sessions = generateMockSessions(1000);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      expect(() => render(<SessionList />)).not.toThrow();
    });
  });

  describe("Keyboard Navigation (AC #3)", () => {
    it("ArrowDown moves focus to next session", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{ArrowDown}");

      // First item should be focused
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveFocus();
    });

    it("ArrowUp moves focus to previous session", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");

      // Should be on first item after down-down-up
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveFocus();
    });

    it("Enter selects focused session", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

      // Second session (index 1) should be selected
      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBe(sessions[1].id);
    });

    it("Home moves focus to first session", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Home}");

      // Should be on first item
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveFocus();
    });

    it("End moves focus to last session", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{End}");

      // Should be on last item
      const items = screen.getAllByRole("option");
      expect(items.at(-1)).toHaveFocus();
    });

    it("does not move focus past first item with ArrowUp", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(5);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{ArrowDown}{ArrowUp}{ArrowUp}");

      // Should still be on first item
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveFocus();
    });

    it("does not move focus past last item with ArrowDown", async () => {
      const user = userEvent.setup();
      const sessions = generateMockSessions(3);
      useSessionStore.setState({ sessions, activeSessionId: sessions[0].id });

      render(<SessionList />);

      const list = screen.getByRole("listbox");
      await user.click(list);
      await user.keyboard("{End}{ArrowDown}{ArrowDown}");

      // Should still be on last item
      const items = screen.getAllByRole("option");
      expect(items.at(-1)).toHaveFocus();
    });
  });
});
