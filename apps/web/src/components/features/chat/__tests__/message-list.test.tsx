/**
 * Message List Component Tests
 *
 * Tests for message display and layout.
 * Story 1.3: AC #4 (message display layout)
 * Story 1.5: StreamingMessage integration (Task 4.2, 4.4)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Message } from "@/stores/session";
import { MessageList } from "../message-list";

// Top-level regex patterns for performance
const TIMESTAMP_PATTERN = /just now|min ago|ago/i;
const GENERATING_LOCAL_PHI3_PATTERN = /generating locally via phi-3/i;
const GENERATED_LOCAL_PHI3_PATTERN = /generated locally via phi-3/i;
const GENERATED_GPT4_PATTERN = /generated via gpt-4/i;
const DURATION_2_5S_PATTERN = /2.5s/;
const TOKENS_50_PATTERN = /50 tokens/;

const createMessage = (
  role: "user" | "assistant",
  content: string,
  id = crypto.randomUUID(),
  metadata?: Message["metadata"]
): Message => ({
  id,
  role,
  content,
  timestamp: new Date(),
  metadata,
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
      const timeElement = screen.getByText(TIMESTAMP_PATTERN);
      expect(timeElement.tagName.toLowerCase()).toBe("time");
    });

    it("time element has dateTime attribute", () => {
      const messages = [createMessage("user", "Test message")];
      render(<MessageList messages={messages} />);

      const timeElement = screen.getByText(TIMESTAMP_PATTERN);
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

  describe("StreamingMessage Integration (Story 1.5)", () => {
    it("renders StreamingMessage for streaming assistant message (Task 4.2)", () => {
      const messageId = "streaming-msg-1";
      const messages = [createMessage("assistant", "Generating...", messageId)];
      const streamingMetadata = {
        messageId,
        source: "local" as const,
        modelName: "phi-3",
        startTime: Date.now(),
        tokenCount: 3,
      };

      render(
        <MessageList
          messages={messages}
          streamingMetadata={streamingMetadata}
        />
      );

      // Should show InferenceBadge with generating state
      expect(screen.getByRole("status")).toHaveTextContent(
        GENERATING_LOCAL_PHI3_PATTERN
      );
    });

    it("shows badge persistence after completion (Task 4.4)", () => {
      const messageId = "completed-msg-1";
      const messages = [
        createMessage("assistant", "Complete response", messageId, {
          finishReason: "completed",
          durationMs: 2500,
          tokensGenerated: 50,
          inference: {
            source: "local",
            modelName: "phi-3",
            startTime: Date.now() - 2500,
            tokenCount: 50,
            duration: 2500,
          },
        }),
      ];

      render(<MessageList messages={messages} />);

      // Badge should persist with complete state and timing
      expect(screen.getByRole("status")).toHaveTextContent(
        GENERATED_LOCAL_PHI3_PATTERN
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        DURATION_2_5S_PATTERN
      );
      expect(screen.getByRole("status")).toHaveTextContent(TOKENS_50_PATTERN);
    });

    it("shows cloud badge for cloud source (AC4)", () => {
      const messageId = "cloud-msg-1";
      const messages = [
        createMessage("assistant", "Cloud response", messageId, {
          finishReason: "completed",
          inference: {
            source: "cloud:openai",
            modelName: "gpt-4",
            startTime: Date.now() - 1000,
            tokenCount: 25,
            duration: 1000,
          },
        }),
      ];

      const { container } = render(<MessageList messages={messages} />);

      // Badge should have cloud styling (slate, not emerald)
      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-slate-50");
      expect(screen.getByRole("status")).toHaveTextContent(
        GENERATED_GPT4_PATTERN
      );
    });

    it("renders regular Message for assistant without inference metadata", () => {
      const messages = [createMessage("assistant", "Old AI message")];
      render(<MessageList messages={messages} />);

      // Should render regular message (bg-muted), not StreamingMessage
      const messageBox = screen.getByText("Old AI message").closest("div");
      expect(messageBox?.className).toContain("bg-muted");
    });
  });
});
