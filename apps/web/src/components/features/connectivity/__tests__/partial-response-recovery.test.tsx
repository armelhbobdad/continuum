import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PartialResponseState } from "@/types/connectivity-transition";
import { PartialResponseRecovery } from "../partial-response-recovery";

/**
 * PartialResponseRecovery Component Tests
 *
 * Story 4.4: AC3
 * Tests for interrupted response recovery UI.
 */
describe("PartialResponseRecovery", () => {
  const mockPartialResponse: PartialResponseState = {
    messageId: "msg-123",
    sessionId: "session-456",
    content: "This is some partial content that was interrupted...",
    timestamp: Date.now(),
    retryable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders partial content", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    expect(
      screen.getByText(/This is some partial content/)
    ).toBeInTheDocument();
  });

  it("shows interrupted status message", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    expect(screen.getByText("Response interrupted")).toBeInTheDocument();
  });

  it("shows waiting for connection message when offline", () => {
    render(
      <PartialResponseRecovery
        isOnline={false}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    expect(screen.getByText(/Waiting for connection/)).toBeInTheDocument();
  });

  it("enables retry button when online and retryable", () => {
    const onRetry = vi.fn();
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={onRetry}
        partialResponse={mockPartialResponse}
      />
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).not.toBeDisabled();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it("disables retry button when offline", () => {
    render(
      <PartialResponseRecovery
        isOnline={false}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeDisabled();
  });

  it("disables retry button when not retryable", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={{ ...mockPartialResponse, retryable: false }}
      />
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeDisabled();
  });

  it("calls onKeepPartial when keep partial button clicked", () => {
    const onKeepPartial = vi.fn();
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={onKeepPartial}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    const keepButton = screen.getByRole("button", { name: /keep partial/i });
    fireEvent.click(keepButton);

    expect(onKeepPartial).toHaveBeenCalled();
  });

  it("shows error message when error exists", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={{
          ...mockPartialResponse,
          error: "Failed to reconnect",
        }}
      />
    );

    expect(screen.getByText("Failed to reconnect")).toBeInTheDocument();
  });

  it("has correct data-slot attribute", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    expect(screen.getByTestId("partial-response-recovery")).toHaveAttribute(
      "data-slot",
      "partial-response-recovery"
    );
  });

  it("has correct accessibility attributes", () => {
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    // <section> with aria-label implicitly has region role per HTML spec
    const container = screen.getByRole("region", {
      name: "Interrupted response",
    });
    expect(container).toBeInTheDocument();
  });
});
