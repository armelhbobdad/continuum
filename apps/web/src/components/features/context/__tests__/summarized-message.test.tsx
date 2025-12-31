/**
 * SummarizedMessage Component Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 4: Tests for summarized message display
 * AC #3: Visual distinction for summaries
 * AC #4: Show original on expansion
 *
 * Task 4.4: Uses Base UI Collapsible primitive
 * Task 4.5: Animates with accordion animations
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/stores/session";
import { SummarizedMessage } from "../summarized-message";

// Top-level regex patterns for performance
const SUMMARIZED_MESSAGES_PATTERN = /summarized 5 messages/i;
const SHOW_ORIGINAL_PATTERN = /show original/i;
const SAVED_PATTERN = /saved/i;

// Mock session store for expansion state
vi.mock("@/stores/session", () => ({
  useSessionStore: vi.fn(),
}));

import { useSessionStore } from "@/stores/session";

const mockUseSessionStore = useSessionStore as unknown as ReturnType<
  typeof vi.fn
>;

describe("SummarizedMessage", () => {
  const mockOnToggle = vi.fn();

  const defaultProps = {
    summaryContent: "This is a summary of the conversation.",
    messageCount: 5,
    originalTokenCount: 500,
    summarizedTokenCount: 100,
    summarizedAt: new Date("2025-12-31T10:00:00Z"),
    isExpanded: false,
    onToggle: mockOnToggle,
    originalMessages: [] as Message[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        expandedSummaries: new Set<string>(),
        toggleSummaryExpansion: vi.fn(),
      } as unknown as ReturnType<typeof useSessionStore.getState>)
    );
  });

  it("renders summary content", () => {
    render(<SummarizedMessage {...defaultProps} />);

    expect(
      screen.getByText("This is a summary of the conversation.")
    ).toBeInTheDocument();
  });

  it("displays message count label", () => {
    render(<SummarizedMessage {...defaultProps} />);

    expect(screen.getByText(SUMMARIZED_MESSAGES_PATTERN)).toBeInTheDocument();
  });

  it("has visual distinction with different background", () => {
    render(<SummarizedMessage {...defaultProps} />);

    const container = screen.getByTestId("summarized-message");
    expect(container).toHaveClass("bg-blue-50");
  });

  it("has correct data-slot attribute", () => {
    render(<SummarizedMessage {...defaultProps} />);

    expect(screen.getByTestId("summarized-message")).toHaveAttribute(
      "data-slot",
      "summarized-message"
    );
  });

  it("calls onToggle when expand button clicked", async () => {
    const user = userEvent.setup();
    render(<SummarizedMessage {...defaultProps} />);

    const expandButton = screen.getByRole("button", {
      name: SHOW_ORIGINAL_PATTERN,
    });
    await user.click(expandButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it("shows originals when expanded", () => {
    const originalMessages: Message[] = [
      {
        id: "msg-1",
        role: "user",
        content: "Hello there",
        timestamp: new Date(),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Hi! How can I help?",
        timestamp: new Date(),
      },
    ];

    render(
      <SummarizedMessage
        {...defaultProps}
        isExpanded={true}
        originalMessages={originalMessages}
      />
    );

    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("hides originals when collapsed", () => {
    const originalMessages: Message[] = [
      {
        id: "msg-1",
        role: "user",
        content: "Hello there",
        timestamp: new Date(),
      },
    ];

    render(
      <SummarizedMessage
        {...defaultProps}
        isExpanded={false}
        originalMessages={originalMessages}
      />
    );

    expect(screen.queryByText("Hello there")).not.toBeInTheDocument();
  });

  it("displays token savings", () => {
    render(<SummarizedMessage {...defaultProps} />);

    // Shows reduction: 500 -> 100 tokens = 80% saved
    expect(screen.getByText(SAVED_PATTERN)).toBeInTheDocument();
  });

  it("has accessible expand button", () => {
    render(<SummarizedMessage {...defaultProps} />);

    const expandButton = screen.getByRole("button", {
      name: SHOW_ORIGINAL_PATTERN,
    });
    expect(expandButton).toBeInTheDocument();
  });
});
