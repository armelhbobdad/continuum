/**
 * SummarizationPrompt Component Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 3: Tests for summarization prompt UI
 * AC #1: Inline prompt when context is critical
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SummarizationPrompt } from "../summarization-prompt";

// Mock the hook
vi.mock("@/hooks/use-context-health", () => ({
  useContextHealth: vi.fn(),
}));

import { useContextHealth } from "@/hooks/use-context-health";

const mockUseContextHealth = useContextHealth as ReturnType<typeof vi.fn>;

describe("SummarizationPrompt", () => {
  const mockOnSummarize = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when health status is not critical", () => {
    mockUseContextHealth.mockReturnValue({
      health: { status: "healthy", percentage: 30 },
      metrics: { totalTokens: 300, messageCount: 5 },
      modelContextLength: 4096,
      isLoading: false,
    });

    const { container } = render(
      <SummarizationPrompt
        messagesCount={5}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when health status is warning", () => {
    mockUseContextHealth.mockReturnValue({
      health: { status: "warning", percentage: 60 },
      metrics: { totalTokens: 600, messageCount: 10 },
      modelContextLength: 4096,
      isLoading: false,
    });

    const { container } = render(
      <SummarizationPrompt
        messagesCount={10}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders prompt when health status is critical", () => {
    mockUseContextHealth.mockReturnValue({
      health: { status: "critical", percentage: 85, tokensUsed: 3400 },
      metrics: { totalTokens: 3400, messageCount: 20 },
      modelContextLength: 4096,
      isLoading: false,
    });

    render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    expect(screen.getByTestId("summarization-prompt")).toBeInTheDocument();
  });

  it("displays message count to be summarized", () => {
    mockUseContextHealth.mockReturnValue({
      health: { status: "critical", percentage: 85, tokensUsed: 3400 },
      metrics: { totalTokens: 3400, messageCount: 20 },
      modelContextLength: 4096,
      isLoading: false,
    });

    render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    // The description shows "Summarize N older messages..."
    expect(
      screen.getByText(/older messages to free up space/i)
    ).toBeInTheDocument();
  });

  it("calls onSummarize when Summarize button clicked", async () => {
    const user = userEvent.setup();
    mockUseContextHealth.mockReturnValue({
      health: { status: "critical", percentage: 85, tokensUsed: 3400 },
      metrics: { totalTokens: 3400, messageCount: 20 },
      modelContextLength: 4096,
      isLoading: false,
    });

    render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    const summarizeButton = screen.getByRole("button", { name: /summarize/i });
    await user.click(summarizeButton);

    expect(mockOnSummarize).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when Dismiss button clicked", async () => {
    const user = userEvent.setup();
    mockUseContextHealth.mockReturnValue({
      health: { status: "critical", percentage: 85, tokensUsed: 3400 },
      metrics: { totalTokens: 3400, messageCount: 20 },
      modelContextLength: 4096,
      isLoading: false,
    });

    render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("has correct data-slot attribute", () => {
    mockUseContextHealth.mockReturnValue({
      health: { status: "critical", percentage: 85, tokensUsed: 3400 },
      metrics: { totalTokens: 3400, messageCount: 20 },
      modelContextLength: 4096,
      isLoading: false,
    });

    render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    expect(screen.getByTestId("summarization-prompt")).toHaveAttribute(
      "data-slot",
      "summarization-prompt"
    );
  });

  it("renders nothing when no health data", () => {
    mockUseContextHealth.mockReturnValue({
      health: null,
      metrics: null,
      modelContextLength: 4096,
      isLoading: false,
    });

    const { container } = render(
      <SummarizationPrompt
        messagesCount={20}
        onDismiss={mockOnDismiss}
        onSummarize={mockOnSummarize}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
