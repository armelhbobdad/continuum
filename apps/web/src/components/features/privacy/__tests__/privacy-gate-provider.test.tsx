/**
 * Privacy Gate Provider Tests
 *
 * Tests for network blocking in PrivacyGateProvider, including Airplane Mode.
 * Story 4.2: AC #1, AC #2
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { PrivacyGateProvider } from "../privacy-gate-provider";

/** Regex patterns for test assertions */
const JAZZKEY_PATTERN = /^jazz-cloud-enhanced-/;
const AIRPLANE_MODE_ERROR_PATTERN = /Airplane Mode active/;

// Mock the window APIs
const originalFetch = global.fetch;

describe("PrivacyGateProvider - Airplane Mode", () => {
  beforeEach(() => {
    // Reset store
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      jazzKey: `jazz-cloud-enhanced-${Date.now()}`,
      networkLog: [],
      isDashboardOpen: false,
      airplaneMode: false,
      previousMode: null,
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders children with mode and jazzKey", () => {
    render(
      <PrivacyGateProvider>
        {({ mode, jazzKey }) => (
          <div>
            <span data-testid="mode">{mode}</span>
            <span data-testid="jazzkey">{jazzKey}</span>
          </div>
        )}
      </PrivacyGateProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("cloud-enhanced");
    expect(screen.getByTestId("jazzkey")).toHaveTextContent(JAZZKEY_PATTERN);
  });

  it("blocks network requests when airplaneMode is true regardless of mode", async () => {
    // Set to cloud-enhanced but enable airplane mode
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      airplaneMode: true,
      previousMode: "cloud-enhanced",
    });

    const TestComponent = () => {
      const [error, setError] = useState<string>("");
      const [tested, setTested] = useState(false);

      const tryFetch = async () => {
        try {
          await fetch("https://external-api.example.com/data");
        } catch (e) {
          setError((e as Error).message);
        }
        setTested(true);
      };

      return (
        <PrivacyGateProvider>
          {() => (
            <div>
              <button
                data-testid="fetch-button"
                onClick={tryFetch}
                type="button"
              >
                Fetch
              </button>
              {error && <span data-testid="error">{error}</span>}
              {tested && <span data-testid="tested">tested</span>}
            </div>
          )}
        </PrivacyGateProvider>
      );
    };

    render(<TestComponent />);

    // Trigger fetch
    await act(async () => {
      screen.getByTestId("fetch-button").click();
    });

    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId("tested")).toBeInTheDocument();
    });

    // Should have blocked with airplane mode error
    expect(screen.getByTestId("error")).toHaveTextContent(
      AIRPLANE_MODE_ERROR_PATTERN
    );
  });

  it("allows network requests when airplaneMode is false in cloud-enhanced mode", async () => {
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      airplaneMode: false,
    });

    const TestComponent = () => {
      const [success, setSuccess] = useState(false);

      const tryFetch = async () => {
        try {
          await fetch("https://external-api.example.com/data");
          setSuccess(true);
        } catch {
          // Ignore
        }
      };

      return (
        <PrivacyGateProvider>
          {() => (
            <div>
              <button
                data-testid="fetch-button"
                onClick={tryFetch}
                type="button"
              >
                Fetch
              </button>
              {success && <span data-testid="success">success</span>}
            </div>
          )}
        </PrivacyGateProvider>
      );
    };

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId("fetch-button").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("success")).toBeInTheDocument();
    });
  });

  it("logs blocked requests with Airplane Mode reason", async () => {
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      airplaneMode: true,
      previousMode: "cloud-enhanced",
      networkLog: [],
    });

    const TestComponent = () => {
      const [tested, setTested] = useState(false);

      // Use effect to trigger fetch after component mounts (and gate provider sets up)
      const handleClick = () => {
        fetch("https://api.example.com/test").catch(() => {
          // Intentionally ignored - we're testing the logging, not the error
        });
        setTested(true);
      };

      return (
        <PrivacyGateProvider>
          {() => (
            <div>
              <button data-testid="trigger" onClick={handleClick} type="button">
                Trigger
              </button>
              {tested && <span data-testid="tested">tested</span>}
            </div>
          )}
        </PrivacyGateProvider>
      );
    };

    render(<TestComponent />);

    // Trigger fetch after effect has run
    await act(async () => {
      screen.getByTestId("trigger").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("tested")).toBeInTheDocument();
    });

    const log = usePrivacyStore.getState().networkLog;
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].reason).toContain("Airplane Mode");
  });

  it("logs local-only mode blocked requests with correct reason", async () => {
    usePrivacyStore.setState({
      mode: "local-only",
      airplaneMode: false,
      networkLog: [],
    });

    const TestComponent = () => {
      const [tested, setTested] = useState(false);

      const handleClick = () => {
        fetch("https://api.example.com/test").catch(() => {
          // Intentionally ignored - we're testing the logging, not the error
        });
        setTested(true);
      };

      return (
        <PrivacyGateProvider>
          {() => (
            <div>
              <button data-testid="trigger" onClick={handleClick} type="button">
                Trigger
              </button>
              {tested && <span data-testid="tested">tested</span>}
            </div>
          )}
        </PrivacyGateProvider>
      );
    };

    render(<TestComponent />);

    // Trigger fetch after effect has run
    await act(async () => {
      screen.getByTestId("trigger").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("tested")).toBeInTheDocument();
    });

    const log = usePrivacyStore.getState().networkLog;
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].reason).toContain("local-only");
  });
});
