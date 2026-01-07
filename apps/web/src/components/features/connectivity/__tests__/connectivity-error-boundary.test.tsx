import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

  it("renders children when no error", async () => {
    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary>
        <div>Test content</div>
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders error UI when child throws error", async () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("detects network errors and shows appropriate message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Failed to fetch")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText(/connection interrupted/i)).toBeInTheDocument();
    expect(screen.getByText(/your work is safe/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("shows continue offline button for network errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary>
        <ErrorThrower error={new Error("Network error")} />
      </ConnectivityErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: /continue offline/i })
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("resets error state when retry button clicked", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );

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

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Fix the error condition before retrying
    shouldError = false;

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // Re-render to pick up the state change
    rerender(
      <ConnectivityErrorBoundary>
        <ConditionalError />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("calls onError callback when error caught", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary onError={onError}>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("renders custom fallback when provided", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
    render(
      <ConnectivityErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ErrorThrower error={new Error("Test error")} />
      </ConnectivityErrorBoundary>
    );

    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("has correct data-slot attribute", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
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

  it("has correct accessibility attributes", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { ConnectivityErrorBoundary } = await import(
      "../connectivity-error-boundary"
    );
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
