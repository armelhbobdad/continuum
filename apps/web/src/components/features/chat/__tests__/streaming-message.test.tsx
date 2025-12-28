/**
 * StreamingMessage Tests
 *
 * Story 1.5: Inference Badge & Streaming UI
 * Task 2, Task 7.2
 * AC2: Streaming Token Display
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamingMessage } from "../streaming-message";

describe("StreamingMessage", () => {
  describe("Token rendering (AC2)", () => {
    it("renders content as it streams", () => {
      render(
        <StreamingMessage
          content="Hello world"
          inferenceSource="local"
          isStreaming={true}
          modelName="test-model"
          startTime={Date.now()}
          tokenCount={2}
        />
      );

      expect(screen.getByText(/Hello world/)).toBeInTheDocument();
    });

    it("shows cursor indicator during generation", () => {
      const { container } = render(
        <StreamingMessage
          content="Generating..."
          inferenceSource="local"
          isStreaming={true}
          modelName="test-model"
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      const cursor = container.querySelector('[data-slot="streaming-cursor"]');
      expect(cursor).toBeInTheDocument();
    });

    it("hides cursor when streaming completes", () => {
      const { container } = render(
        <StreamingMessage
          content="Complete response"
          inferenceSource="local"
          isStreaming={false}
          modelName="test-model"
          startTime={Date.now() - 1000}
          tokenCount={10}
        />
      );

      const cursor = container.querySelector('[data-slot="streaming-cursor"]');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  describe("InferenceBadge integration (AC2)", () => {
    it("shows InferenceBadge with generating state when streaming", () => {
      render(
        <StreamingMessage
          content="Test"
          inferenceSource="local"
          isStreaming={true}
          modelName="phi-3"
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/generating locally via phi-3/i);
    });

    it("shows InferenceBadge with complete state when done", () => {
      render(
        <StreamingMessage
          content="Done"
          inferenceSource="local"
          isStreaming={false}
          modelName="phi-3"
          startTime={Date.now() - 2000}
          tokenCount={50}
        />
      );

      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/generated locally via phi-3/i);
    });

    it("passes tokenCount to badge when complete", () => {
      render(
        <StreamingMessage
          content="Done"
          inferenceSource="local"
          isStreaming={false}
          modelName="phi-3"
          startTime={Date.now() - 3000}
          tokenCount={150}
        />
      );

      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent(/150 tokens/);
    });
  });

  describe("State transition (AC2, AC3)", () => {
    it("calls onComplete when transitioning from streaming to complete", () => {
      const onComplete = vi.fn();

      const { rerender } = render(
        <StreamingMessage
          content="Test"
          inferenceSource="local"
          isStreaming={true}
          modelName="test-model"
          onComplete={onComplete}
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      expect(onComplete).not.toHaveBeenCalled();

      // Transition to complete
      rerender(
        <StreamingMessage
          content="Test complete"
          inferenceSource="local"
          isStreaming={false}
          modelName="test-model"
          onComplete={onComplete}
          startTime={Date.now() - 1000}
          tokenCount={10}
        />
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Content display", () => {
    it("renders prose styling for AI response", () => {
      const { container } = render(
        <StreamingMessage
          content="# Heading\n\nParagraph"
          inferenceSource="local"
          isStreaming={false}
          modelName="test-model"
          startTime={Date.now()}
          tokenCount={5}
        />
      );

      const contentArea = container.querySelector(
        '[data-slot="message-content"]'
      );
      expect(contentArea).toHaveClass("prose");
    });
  });

  describe("Mode-aware badge styling (BC-003)", () => {
    it("shows local styling for local source", () => {
      const { container } = render(
        <StreamingMessage
          content="Test"
          inferenceSource="local"
          isStreaming={true}
          modelName="test-model"
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-emerald-50");
    });

    it("shows cloud styling for cloud source", () => {
      const { container } = render(
        <StreamingMessage
          content="Test"
          inferenceSource="cloud:openai"
          isStreaming={true}
          modelName="gpt-4"
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-slate-50");
    });

    it("handles stub source for web fallback", () => {
      render(
        <StreamingMessage
          content="Test"
          inferenceSource="stub"
          isStreaming={true}
          modelName="stub-model"
          startTime={Date.now()}
          tokenCount={1}
        />
      );

      // Should render without error
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
