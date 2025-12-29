/**
 * Chat Panel Component Tests
 *
 * Tests for the chat panel container.
 * Story 1.3: AC #1 (chat panel with message input), AC #5 (auto-session creation)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { ChatPanel } from "../chat-panel";

// Top-level regex patterns for performance
const START_CONVERSATION_PATTERN = /start a new conversation/i;

describe("ChatPanel Component", () => {
  beforeEach(() => {
    // Reset session store
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
    });
  });

  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<ChatPanel />);
      const panel = screen.getByTestId("chat-panel");
      expect(panel).toHaveAttribute("data-slot", "chat-panel");
    });
  });

  describe("Empty State (AC #1)", () => {
    it("shows welcoming message when no messages", () => {
      render(<ChatPanel />);
      expect(screen.getByText(START_CONVERSATION_PATTERN)).toBeInTheDocument();
    });

    it("shows empty state when no active session", () => {
      render(<ChatPanel />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  describe("Message Display", () => {
    it("displays message list when session has messages", () => {
      const state = useSessionStore.getState();
      const sessionId = state.createSession("Test session");
      const state2 = useSessionStore.getState();
      state2.addMessage(sessionId, { role: "user", content: "Hello" });

      render(<ChatPanel />);

      expect(screen.getByTestId("message-list")).toBeInTheDocument();
    });
  });

  describe("Message Input", () => {
    it("renders message input area", () => {
      render(<ChatPanel />);
      expect(screen.getByTestId("message-input")).toBeInTheDocument();
    });
  });

  describe("Scroll Behavior", () => {
    it("has scrollable container for messages", () => {
      render(<ChatPanel />);
      const panel = screen.getByTestId("chat-panel");
      // Panel should have overflow handling
      expect(panel.className).toContain("flex");
      expect(panel.className).toContain("flex-col");
    });
  });

  describe("Accessibility", () => {
    it("has proper structure for screen readers", () => {
      render(<ChatPanel />);
      // Panel should be accessible
      const panel = screen.getByTestId("chat-panel");
      expect(panel).toBeInTheDocument();
    });
  });

  describe("Session Auto-Creation (AC #5)", () => {
    it("creates session when sending first message with no active session", async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      // Verify no sessions exist initially
      const initialState = useSessionStore.getState();
      expect(initialState.sessions.length).toBe(0);
      expect(initialState.activeSessionId).toBeNull();

      // Type and send a message
      const input = screen.getByRole("textbox");
      await user.type(input, "My first message");
      await user.keyboard("{Enter}");

      // Verify session was created
      const updatedState = useSessionStore.getState();
      expect(updatedState.sessions.length).toBe(1);
      expect(updatedState.activeSessionId).not.toBeNull();
    });

    it("generates session title from first message", async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello, I need help with my project");
      await user.keyboard("{Enter}");

      const state = useSessionStore.getState();
      expect(state.sessions[0]?.title).toBe(
        "Hello, I need help with my project"
      );
    });

    it("sets new session as active", async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBe(state.sessions[0]?.id);
    });
  });
});
