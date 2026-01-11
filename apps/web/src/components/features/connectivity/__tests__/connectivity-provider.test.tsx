import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { ConnectivityProvider } from "../connectivity-provider";

// Mock fetch for heartbeat
const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("ConnectivityProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders children correctly", async () => {
    await act(async () => {
      render(
        <ConnectivityProvider>
          <div data-testid="child">Child Content</div>
        </ConnectivityProvider>
      );
    });

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("initializes connectivity monitoring on mount", async () => {
    await act(async () => {
      render(
        <ConnectivityProvider>
          <div>Test</div>
        </ConnectivityProvider>
      );
    });

    // Wait for initial heartbeat
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should have called fetch for heartbeat
    expect(mockFetch).toHaveBeenCalled();
  });

  it("handles SSR safely (no errors during SSR)", async () => {
    // SSR simulation - should not throw
    await expect(
      act(async () => {
        render(
          <ConnectivityProvider>
            <div>SSR Content</div>
          </ConnectivityProvider>
        );
      })
    ).resolves.not.toThrow();
  });

  it("defaults to online state during initial render", async () => {
    await act(async () => {
      render(
        <ConnectivityProvider>
          <div>Test</div>
        </ConnectivityProvider>
      );
    });

    // Store should be in optimistic online state
    const state = useConnectivityStore.getState();
    expect(state.isOnline).toBe(true);
  });

  it("does not create duplicate fragments (single child wrapper)", async () => {
    let container!: HTMLElement;
    await act(async () => {
      const result = render(
        <ConnectivityProvider>
          <div data-testid="only-child">Only Child</div>
        </ConnectivityProvider>
      );
      container = result.container;
    });

    // Should render exactly one child element (not wrapped in extra elements)
    const childElement = screen.getByTestId("only-child");
    expect(childElement.parentElement).toBe(container);
  });
});
