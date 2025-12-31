/**
 * SummarizationProgress Component Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 7: Tests for summarization progress UI
 * AC #2: Streaming progress shown
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SummarizationProgress } from "../summarization-progress";

describe("SummarizationProgress", () => {
  const mockOnCancel = vi.fn();

  it("renders nothing when not summarizing", () => {
    const { container } = render(
      <SummarizationProgress
        isSummarizing={false}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={0}
        streamingText=""
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows progress bar when summarizing", () => {
    render(
      <SummarizationProgress
        isSummarizing={true}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={50}
        streamingText=""
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("displays message count in label", () => {
    render(
      <SummarizationProgress
        isSummarizing={true}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={30}
        streamingText=""
      />
    );

    expect(screen.getByText(/summarizing 5 messages/i)).toBeInTheDocument();
  });

  it("shows streaming text as it generates", () => {
    render(
      <SummarizationProgress
        isSummarizing={true}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={60}
        streamingText="The conversation covered..."
      />
    );

    expect(screen.getByText("The conversation covered...")).toBeInTheDocument();
  });

  it("has cancel button that calls onCancel", async () => {
    const user = userEvent.setup();
    render(
      <SummarizationProgress
        isSummarizing={true}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={40}
        streamingText=""
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("has correct data-slot attribute", () => {
    render(
      <SummarizationProgress
        isSummarizing={true}
        messageCount={5}
        onCancel={mockOnCancel}
        progress={20}
        streamingText=""
      />
    );

    expect(screen.getByTestId("summarization-progress")).toHaveAttribute(
      "data-slot",
      "summarization-progress"
    );
  });
});
