/**
 * Message List Component Tests
 *
 * Tests for message display and layout.
 * Story 1.3: AC #4 (message display layout)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Message } from "@/stores/session";
import { MessageList } from "../message-list";

const createMessage = (
  role: "user" | "assistant",
  content: string,
  id = crypto.randomUUID()
): Message => ({
  id,
  role,
  content,
  timestamp: new Date(),
});

describe("MessageList Component", () => {
  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<MessageList messages={[]} />);
      const list = screen.getByTestId("message-list");
      expect(list).toHaveAttribute("data-slot", "message-list");
    });

    it("displays all messages", () => {
      const messages = [
        createMessage("user", "Hello"),
        createMessage("assistant", "Hi there!"),
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
  });

  describe("Message Layout (AC #4)", () => {
    it("user messages appear on the right", () => {
      const messages = [createMessage("user", "User message")];
      render(<MessageList messages={messages} />);

      const messageContainer = screen
        .getByText("User message")
        .closest("[class*='justify-']");
      expect(messageContainer?.className).toContain("justify-end");
    });

    it("assistant messages appear on the left", () => {
      const messages = [createMessage("assistant", "AI message")];
      render(<MessageList messages={messages} />);

      const messageContainer = screen
        .getByText("AI message")
        .closest("[class*='justify-']");
      expect(messageContainer?.className).toContain("justify-start");
    });
  });

  describe("Timestamps", () => {
    it("shows timestamp for each message", () => {
      const messages = [createMessage("user", "Test message")];
      render(<MessageList messages={messages} />);

      // Should have a <time> element
      const timeElement = screen.getByText(/just now|min ago|ago/i);
      expect(timeElement.tagName.toLowerCase()).toBe("time");
    });

    it("time element has dateTime attribute", () => {
      const messages = [createMessage("user", "Test message")];
      render(<MessageList messages={messages} />);

      const timeElement = screen.getByText(/just now|min ago|ago/i);
      expect(timeElement).toHaveAttribute("datetime");
    });
  });

  describe("Accessibility (AC #4)", () => {
    it("has role=log for message log semantics", () => {
      render(<MessageList messages={[]} />);
      const list = screen.getByRole("log");
      expect(list).toBeInTheDocument();
    });

    it("has aria-live=polite for new message announcements", () => {
      render(<MessageList messages={[]} />);
      const list = screen.getByRole("log");
      expect(list).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Styling", () => {
    it("user messages have primary styling", () => {
      const messages = [createMessage("user", "User message")];
      render(<MessageList messages={messages} />);

      const messageBox = screen.getByText("User message").closest("div");
      expect(messageBox?.className).toContain("bg-primary");
    });

    it("assistant messages have muted styling", () => {
      const messages = [createMessage("assistant", "AI message")];
      render(<MessageList messages={messages} />);

      const messageBox = screen.getByText("AI message").closest("div");
      expect(messageBox?.className).toContain("bg-muted");
    });

    it("messages have max-width constraint", () => {
      const messages = [createMessage("user", "User message")];
      render(<MessageList messages={messages} />);

      const messageBox = screen.getByText("User message").closest("div");
      expect(messageBox?.className).toContain("max-w-");
    });
  });
});
