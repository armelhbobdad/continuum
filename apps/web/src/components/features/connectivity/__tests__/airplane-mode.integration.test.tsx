import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivacyGateProvider } from "@/components/features/privacy/privacy-gate-provider";
import { usePrivacyStore } from "@/stores/privacy";

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

/**
 * Airplane Mode Integration Tests
 *
 * Story 4.2: All Acceptance Criteria
 * Tests the full airplane mode flow including network blocking, mode transitions, and state persistence.
 */

// Save original APIs for restoration
const originalFetch = globalThis.fetch;
const OriginalXMLHttpRequest = globalThis.XMLHttpRequest;

// Test wrapper component that calls fetch after mount
function NetworkTestComponent({
  onFetchResult,
  url = "https://api.example.com/data",
}: {
  onFetchResult?: (result: "success" | "blocked") => void;
  url?: string;
}) {
  return (
    <button
      data-testid="fetch-trigger"
      onClick={async () => {
        try {
          await fetch(url);
          onFetchResult?.("success");
        } catch {
          onFetchResult?.("blocked");
        }
      }}
      type="button"
    >
      Trigger Fetch
    </button>
  );
}

function TestWrapper({ children }: { children: ReactNode }) {
  // PrivacyGateProvider reads state from usePrivacyStore() internally
  return <PrivacyGateProvider>{() => children}</PrivacyGateProvider>;
}

describe("Airplane Mode Integration", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchSpy;

    // Reset privacy store to default state
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      airplaneMode: false,
      previousMode: null,
      jazzKey: "test-key",
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = OriginalXMLHttpRequest;
    vi.clearAllMocks();
  });

  describe("AC1: Enable Airplane Mode", () => {
    it("8.1 saves previous mode when enabling airplane mode", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      const store = usePrivacyStore.getState();

      store.setAirplaneMode(true);

      const state = usePrivacyStore.getState();
      expect(state.airplaneMode).toBe(true);
      expect(state.previousMode).toBe("cloud-enhanced");
    });

    it("8.1 blocks network requests when airplane mode enabled", async () => {
      usePrivacyStore.setState({ airplaneMode: true });
      let fetchResult: "success" | "blocked" = "success";

      render(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
          />
        </TestWrapper>
      );

      // Trigger fetch after mount (so useEffect has installed interceptors)
      act(() => {
        screen.getByTestId("fetch-trigger").click();
      });

      await waitFor(() => {
        expect(fetchResult).toBe("blocked");
      });
    });
  });

  describe("AC2: Network Blocking When Connected", () => {
    it("8.4 blocks all external network calls when airplane mode active", async () => {
      usePrivacyStore.setState({ airplaneMode: true });
      let fetchResult: "success" | "blocked" = "success";

      render(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
          />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId("fetch-trigger").click();
      });

      await waitFor(() => {
        expect(fetchResult).toBe("blocked");
      });

      // Verify the log entry mentions airplane mode
      const log = usePrivacyStore.getState().networkLog;
      expect(log.some((e) => e.reason?.includes("Airplane Mode"))).toBe(true);
    });

    it("8.4 still allows same-origin requests (relative URLs)", async () => {
      usePrivacyStore.setState({ airplaneMode: true });
      let fetchResult: "success" | "blocked" = "blocked";

      render(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
            url="/api/local"
          />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId("fetch-trigger").click();
      });

      await waitFor(() => {
        expect(fetchResult).toBe("success");
      });
    });
  });

  describe("AC4: Disable and Resume", () => {
    it("8.2 restores previous mode when disabling airplane mode", () => {
      // Start in cloud-enhanced mode
      usePrivacyStore.setState({ mode: "cloud-enhanced" });

      // Enable airplane mode
      usePrivacyStore.getState().setAirplaneMode(true);
      expect(usePrivacyStore.getState().previousMode).toBe("cloud-enhanced");

      // Disable airplane mode
      usePrivacyStore.getState().setAirplaneMode(false);

      const state = usePrivacyStore.getState();
      expect(state.airplaneMode).toBe(false);
      expect(state.mode).toBe("cloud-enhanced");
      expect(state.previousMode).toBeNull();
    });

    it("8.2 allows network requests after airplane mode disabled", async () => {
      // Start with airplane mode enabled
      usePrivacyStore.setState({
        airplaneMode: true,
        previousMode: "cloud-enhanced",
      });
      let fetchResult: "success" | "blocked" = "blocked";

      const { rerender } = render(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
          />
        </TestWrapper>
      );

      // Disable airplane mode
      act(() => {
        usePrivacyStore.getState().setAirplaneMode(false);
      });

      // Re-render to pick up new state
      rerender(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
          />
        </TestWrapper>
      );

      // Trigger fetch - should succeed now
      act(() => {
        screen.getByTestId("fetch-trigger").click();
      });

      await waitFor(() => {
        expect(fetchResult).toBe("success");
      });
    });
  });

  describe("AC1/AC4: Different Initial Privacy Modes", () => {
    it("8.3 works from trusted-network mode", () => {
      usePrivacyStore.setState({ mode: "trusted-network" });
      const store = usePrivacyStore.getState();

      store.setAirplaneMode(true);
      expect(usePrivacyStore.getState().previousMode).toBe("trusted-network");

      store.setAirplaneMode(false);
      expect(usePrivacyStore.getState().mode).toBe("trusted-network");
    });

    it("8.3 works from local-only mode", () => {
      usePrivacyStore.setState({ mode: "local-only" });
      const store = usePrivacyStore.getState();

      store.setAirplaneMode(true);
      expect(usePrivacyStore.getState().previousMode).toBe("local-only");

      store.setAirplaneMode(false);
      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });

    it("8.3 works from cloud-enhanced mode", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      const store = usePrivacyStore.getState();

      store.setAirplaneMode(true);
      expect(usePrivacyStore.getState().previousMode).toBe("cloud-enhanced");

      store.setAirplaneMode(false);
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
    });
  });

  describe("Edge Cases", () => {
    it("handles toggle without previous mode gracefully", () => {
      // Edge case: airplaneMode true but previousMode is null
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: true,
        previousMode: null,
      });

      usePrivacyStore.getState().setAirplaneMode(false);

      // Should fall back to current mode
      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });

    it("airplane mode overrides cloud-enhanced to block network", async () => {
      // Even in cloud-enhanced mode, airplane mode should block
      usePrivacyStore.setState({
        mode: "cloud-enhanced",
        airplaneMode: true,
      });
      let fetchResult: "success" | "blocked" = "success";

      render(
        <TestWrapper>
          <NetworkTestComponent
            onFetchResult={(result) => {
              fetchResult = result;
            }}
          />
        </TestWrapper>
      );

      act(() => {
        screen.getByTestId("fetch-trigger").click();
      });

      await waitFor(() => {
        expect(fetchResult).toBe("blocked");
      });
    });
  });
});
