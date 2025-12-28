/**
 * Message Input Component Tests
 *
 * Tests for message input functionality.
 * Story 1.3: AC #2 (input responsiveness), AC #3 (message submission)
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageInput } from "../message-input";

describe("MessageInput Component", () => {
  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<MessageInput onSend={vi.fn()} />);
      const input = screen.getByTestId("message-input");
      expect(input).toHaveAttribute("data-slot", "message-input");
    });

    it("renders textarea field", () => {
      render(<MessageInput onSend={vi.fn()} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders send button", () => {
      render(<MessageInput onSend={vi.fn()} />);
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });
  });

  describe("Input Behavior (AC #2)", () => {
    it("accepts text input", async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={vi.fn()} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello world");

      expect(textarea).toHaveValue("Hello world");
    });

    it("auto-focuses on mount", async () => {
      render(<MessageInput onSend={vi.fn()} />);
      const textarea = screen.getByRole("textbox");
      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      });
    });
  });

  describe("Message Submission (AC #3)", () => {
    it("calls onSend when Enter is pressed", async () => {
      const user = userEvent.setup();
      const handleSend = vi.fn();
      render(<MessageInput onSend={handleSend} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(handleSend).toHaveBeenCalledWith("Test message");
    });

    it("calls onSend when Send button is clicked", async () => {
      const user = userEvent.setup();
      const handleSend = vi.fn();
      render(<MessageInput onSend={handleSend} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test message");

      const sendBtn = screen.getByRole("button", { name: /send/i });
      await user.click(sendBtn);

      expect(handleSend).toHaveBeenCalledWith("Test message");
    });

    it("clears input after submission", async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={vi.fn()} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(input).toHaveValue("");
    });

    it("returns focus to input after submission", async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={vi.fn()} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(document.activeElement).toBe(input);
    });

    it("does not send empty messages", async () => {
      const user = userEvent.setup();
      const handleSend = vi.fn();
      render(<MessageInput onSend={handleSend} />);

      await user.keyboard("{Enter}");

      expect(handleSend).not.toHaveBeenCalled();
    });

    it("does not send whitespace-only messages", async () => {
      const user = userEvent.setup();
      const handleSend = vi.fn();
      render(<MessageInput onSend={handleSend} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "   ");
      await user.keyboard("{Enter}");

      expect(handleSend).not.toHaveBeenCalled();
    });
  });

  describe("Send Button State", () => {
    it("send button is disabled when input is empty", () => {
      render(<MessageInput onSend={vi.fn()} />);
      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toBeDisabled();
    });

    it("send button is enabled when input has content", async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={vi.fn()} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("input has aria-label", () => {
      render(<MessageInput onSend={vi.fn()} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-label", "Message input");
    });

    it("send button has aria-label", () => {
      render(<MessageInput onSend={vi.fn()} />);
      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toHaveAttribute("aria-label", "Send message");
    });
  });

  describe("Multiline Support", () => {
    it("Shift+Enter creates newline instead of sending", async () => {
      const user = userEvent.setup();
      const handleSend = vi.fn();
      render(<MessageInput onSend={handleSend} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Line 1");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(textarea, "Line 2");

      expect(textarea).toHaveValue("Line 1\nLine 2");
      expect(handleSend).not.toHaveBeenCalled();
    });
  });

  describe("Performance (AC #2 - NFR7)", () => {
    it("input responds within 100ms", async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={vi.fn()} />);

      const textarea = screen.getByRole("textbox");
      const start = performance.now();
      await user.type(textarea, "a");
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe("Disabled State with Reason (Story 2.4 Task 5.3)", () => {
    it("shows disabled reason as title tooltip when disabled", () => {
      render(
        <MessageInput
          disabled
          disabledReason="Switching model..."
          onSend={vi.fn()}
        />
      );

      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).toBeDisabled();
      expect(sendBtn).toHaveAttribute("title", "Switching model...");
    });

    it("does not show title when not disabled", () => {
      render(
        <MessageInput disabledReason="Switching model..." onSend={vi.fn()} />
      );

      const sendBtn = screen.getByRole("button", { name: /send/i });
      expect(sendBtn).not.toHaveAttribute("title");
    });

    it("disables textarea when disabled prop is true", () => {
      render(<MessageInput disabled onSend={vi.fn()} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });
  });
});
