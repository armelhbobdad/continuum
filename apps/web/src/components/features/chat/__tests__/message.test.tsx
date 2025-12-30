/**
 * Message Component Tests
 *
 * Tests for individual message bubble styling and formatting.
 * Story 1.3: AC #4 (message display layout)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Message, messageVariants } from "../message";

// Top-level regex patterns for performance
const LINE_1_PATTERN = /Line 1/;

describe("Message Component", () => {
  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      const message = screen.getByText("Test").closest("[data-slot]");
      expect(message).toHaveAttribute("data-slot", "message");
    });

    it("renders with data-role attribute for user", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      const message = screen.getByText("Test").closest("[data-role]");
      expect(message).toHaveAttribute("data-role", "user");
    });

    it("renders with data-role attribute for assistant", () => {
      render(
        <Message content="Test" role="assistant" timestamp={new Date()} />
      );
      const message = screen.getByText("Test").closest("[data-role]");
      expect(message).toHaveAttribute("data-role", "assistant");
    });

    it("displays message content", () => {
      render(
        <Message content="Hello, world!" role="user" timestamp={new Date()} />
      );
      expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    });

    it("preserves whitespace in content", () => {
      render(
        <Message content="Line 1\nLine 2" role="user" timestamp={new Date()} />
      );
      const content = screen.getByText(LINE_1_PATTERN);
      expect(content.className).toContain("whitespace-pre-wrap");
    });
  });

  describe("CVA Variants (AC #4)", () => {
    it("user messages have primary background", () => {
      render(<Message content="User msg" role="user" timestamp={new Date()} />);
      const message = screen.getByText("User msg").closest("[data-slot]");
      expect(message?.className).toContain("bg-primary");
    });

    it("assistant messages have muted background", () => {
      render(
        <Message content="AI msg" role="assistant" timestamp={new Date()} />
      );
      const message = screen.getByText("AI msg").closest("[data-slot]");
      expect(message?.className).toContain("bg-muted");
    });

    it("user messages are right-aligned", () => {
      render(<Message content="User msg" role="user" timestamp={new Date()} />);
      const message = screen.getByText("User msg").closest("[data-slot]");
      expect(message?.className).toContain("ml-auto");
    });

    it("assistant messages are left-aligned", () => {
      render(
        <Message content="AI msg" role="assistant" timestamp={new Date()} />
      );
      const message = screen.getByText("AI msg").closest("[data-slot]");
      expect(message?.className).toContain("mr-auto");
    });

    it("messages have max-width constraint", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      const message = screen.getByText("Test").closest("[data-slot]");
      expect(message?.className).toContain("max-w-[80%]");
    });

    it("messages have rounded corners", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      const message = screen.getByText("Test").closest("[data-slot]");
      expect(message?.className).toContain("rounded-2xl");
    });

    it("accepts additional className", () => {
      render(
        <Message
          className="custom-class"
          content="Test"
          role="user"
          timestamp={new Date()}
        />
      );
      const message = screen.getByText("Test").closest("[data-slot]");
      expect(message?.className).toContain("custom-class");
    });
  });

  describe("Timestamp Formatting", () => {
    it("shows 'just now' for recent messages", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("shows minutes ago for messages within the hour", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      render(<Message content="Test" role="user" timestamp={fiveMinutesAgo} />);
      expect(screen.getByText("5 min ago")).toBeInTheDocument();
    });

    it("shows hours ago for messages within the day", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      render(<Message content="Test" role="user" timestamp={twoHoursAgo} />);
      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });

    it("shows days ago for messages within the week", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      render(<Message content="Test" role="user" timestamp={twoDaysAgo} />);
      expect(screen.getByText("2 days ago")).toBeInTheDocument();
    });

    it("shows date for older messages (beyond a week)", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      render(<Message content="Test" role="user" timestamp={tenDaysAgo} />);
      // Should show locale date string
      const timeElement = screen.getByRole("time");
      expect(timeElement.textContent).not.toContain("ago");
    });

    it("uses <time> element with dateTime attribute", () => {
      const timestamp = new Date("2025-01-15T10:30:00Z");
      render(<Message content="Test" role="user" timestamp={timestamp} />);
      const timeElement = screen.getByRole("time");
      expect(timeElement).toHaveAttribute("datetime", timestamp.toISOString());
    });

    it("timestamp has reduced opacity styling", () => {
      render(<Message content="Test" role="user" timestamp={new Date()} />);
      const timeElement = screen.getByRole("time");
      // Opacity is on the parent container, not the time element itself
      expect(timeElement.parentElement?.className).toContain("opacity-60");
    });
  });

  describe("messageVariants export", () => {
    it("exports messageVariants for external use", () => {
      expect(messageVariants).toBeDefined();
      expect(typeof messageVariants).toBe("function");
    });

    it("messageVariants returns correct classes for user", () => {
      const classes = messageVariants({ role: "user" });
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("ml-auto");
    });

    it("messageVariants returns correct classes for assistant", () => {
      const classes = messageVariants({ role: "assistant" });
      expect(classes).toContain("bg-muted");
      expect(classes).toContain("mr-auto");
    });
  });

  describe("Model Attribution (Story 2.4 Task 8.3)", () => {
    it("displays model name for assistant messages", () => {
      render(
        <Message
          content="AI response"
          modelName="Phi-3 Mini"
          role="assistant"
          timestamp={new Date()}
        />
      );

      expect(screen.getByTestId("model-attribution")).toHaveTextContent(
        "Phi-3 Mini"
      );
    });

    it("does not display model attribution for user messages", () => {
      render(
        <Message
          content="User msg"
          modelName="Phi-3 Mini"
          role="user"
          timestamp={new Date()}
        />
      );

      expect(screen.queryByTestId("model-attribution")).not.toBeInTheDocument();
    });

    it("does not display model attribution when modelName not provided", () => {
      render(
        <Message
          content="AI response"
          role="assistant"
          timestamp={new Date()}
        />
      );

      expect(screen.queryByTestId("model-attribution")).not.toBeInTheDocument();
    });

    it("adds data-model attribute when model name provided", () => {
      render(
        <Message
          content="AI response"
          modelName="Mistral-7B"
          role="assistant"
          timestamp={new Date()}
        />
      );

      const message = screen.getByText("AI response").closest("[data-slot]");
      expect(message).toHaveAttribute("data-model", "Mistral-7B");
    });

    it("preserves model attribution when content updates", () => {
      const { rerender } = render(
        <Message
          content="Initial response"
          modelName="Phi-3 Mini"
          role="assistant"
          timestamp={new Date()}
        />
      );

      rerender(
        <Message
          content="Updated response"
          modelName="Phi-3 Mini"
          role="assistant"
          timestamp={new Date()}
        />
      );

      expect(screen.getByTestId("model-attribution")).toHaveTextContent(
        "Phi-3 Mini"
      );
    });
  });
});
