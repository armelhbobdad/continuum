import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PartialResponseState } from "@/types/connectivity-transition";

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

  it("renders partial content", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("shows interrupted status message", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("shows waiting for connection message when offline", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("enables retry button when online and retryable", async () => {
    const onRetry = vi.fn();
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("disables retry button when offline", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("disables retry button when not retryable", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("calls onKeepPartial when keep partial button clicked", async () => {
    const onKeepPartial = vi.fn();
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("shows error message when error exists", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("has correct data-slot attribute", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
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

  it("has correct accessibility attributes", async () => {
    const { PartialResponseRecovery } = await import(
      "../partial-response-recovery"
    );
    render(
      <PartialResponseRecovery
        isOnline={true}
        onKeepPartial={vi.fn()}
        onRetry={vi.fn()}
        partialResponse={mockPartialResponse}
      />
    );

    const container = screen.getByTestId("partial-response-recovery");
    expect(container).toHaveAttribute("role", "region");
    expect(container).toHaveAttribute("aria-label", "Interrupted response");
  });
});
