import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectivityErrorBoundary } from "../connectivity-error-boundary";

// Top-level regex patterns for test assertions
const SOMETHING_WENT_WRONG = /something went wrong/i;
const CONNECTION_INTERRUPTED = /connection interrupted/i;
const YOUR_WORK_IS_SAFE = /your work is safe/i;
const CONTINUE_OFFLINE = /continue offline/i;
const TRY_AGAIN = /try again/i;

/**
 * ConnectivityErrorBoundary Component Tests
 *
 * Story 4.4: AC1, AC3
 * Tests for error boundary with network error detection and recovery UI.
 */
describe("ConnectivityErrorBoundary", () => {
  // Component that throws errors for testing
  function ErrorThrower({ error }: { error?: Error }) {
    if (error) {
      throw error;
    }
    return <div>Content rendered successfully</div>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children when no error", () => {
    render(
      <ConnectivityErrorBoundary>
        <div>Test content</div>
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders error UI when child throws error", () => {
    // Suppress console.error for this test
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText(SOMETHING_WENT_WRONG)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("detects network errors and shows appropriate message", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Failed to fetch")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText(CONNECTION_INTERRUPTED)).toBeInTheDocument();
    expect(screen.getByText(YOUR_WORK_IS_SAFE)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("shows continue offline button for network errors", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Network error")} />
      </ConnectivityErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: CONTINUE_OFFLINE })
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("resets error state when retry button clicked", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    let shouldError = true;
    function ConditionalError() {
      if (shouldError) {
        throw new Error("Test error");
      }
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <ConnectivityErrorBoundary>
        <ConditionalError />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText(SOMETHING_WENT_WRONG)).toBeInTheDocument();

    // Fix the error condition before retrying
    shouldError = false;

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: TRY_AGAIN }));

    // Re-render to pick up the state change
    rerender(
      <ConnectivityErrorBoundary>
        <ConditionalError />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("calls onError callback when error caught", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const onError = vi.fn();

    render(
      <ConnectivityErrorBoundary onError={onError}>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("has correct data-slot attribute", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByTestId("connectivity-error-boundary")).toHaveAttribute(
      "data-slot",
      "connectivity-error-boundary"
    );
    consoleSpy.mockRestore();
  });

  it("has correct accessibility attributes", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByTestId("connectivity-error-boundary")).toHaveAttribute(
      "role",
      "alert"
    );
    consoleSpy.mockRestore();
  });
});
