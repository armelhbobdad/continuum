/**
 * Context Critical Alert Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 9: Tests for critical alert component
 * AC #3: Red Critical Threshold
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextCriticalAlert } from "../context-critical-alert";

// Top-level regex patterns for performance
const CONTEXT_NEARLY_FULL_PATTERN = /Context is nearly full/i;
const NEW_SESSION_PATTERN = /New Session/i;
const DISMISS_ALERT_PATTERN = /Dismiss alert/i;

// Mock the hook
vi.mock("@/hooks/use-context-health", () => ({
  useContextHealth: vi.fn(),
}));

// Mock the session store
vi.mock("@/stores/session", () => ({
  useSessionStore: vi.fn(),
}));

import { useContextHealth } from "@/hooks/use-context-health";
import { useSessionStore } from "@/stores/session";

const mockUseContextHealth = useContextHealth as ReturnType<typeof vi.fn>;
const mockUseSessionStore = useSessionStore as unknown as ReturnType<
  typeof vi.fn
>;

describe("ContextCriticalAlert", () => {
  const mockCreateSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        createSession: mockCreateSession,
      } as unknown as ReturnType<typeof useSessionStore.getState>)
    );
  });

  it("renders nothing when no health data", () => {
    mockUseContextHealth.mockReturnValue({
      health: null,
      metrics: null,
      modelContextLength: 4096,
      isLoading: false,
    });

    const { container } = render(<ContextCriticalAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when status is healthy", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "healthy",
        percentage: 30,
        tokensUsed: 300,
        tokensRemaining: 700,
        messageCount: 5,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    const { container } = render(<ContextCriticalAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when status is growing", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "growing",
        percentage: 60,
        tokensUsed: 600,
        tokensRemaining: 400,
        messageCount: 10,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    const { container } = render(<ContextCriticalAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders alert when status is critical", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "critical",
        percentage: 85,
        tokensUsed: 850,
        tokensRemaining: 150,
        messageCount: 20,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    render(<ContextCriticalAlert />);

    expect(screen.getByTestId("context-critical-alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(CONTEXT_NEARLY_FULL_PATTERN)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: NEW_SESSION_PATTERN })
    ).toBeInTheDocument();
  });

  it("creates new session when clicking New Session button", async () => {
    const user = userEvent.setup();

    mockUseContextHealth.mockReturnValue({
      health: {
        status: "critical",
        percentage: 85,
        tokensUsed: 850,
        tokensRemaining: 150,
        messageCount: 20,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    render(<ContextCriticalAlert />);

    await user.click(screen.getByRole("button", { name: NEW_SESSION_PATTERN }));

    expect(mockCreateSession).toHaveBeenCalledWith("New conversation");
  });

  it("dismisses alert when clicking dismiss button", async () => {
    const user = userEvent.setup();

    mockUseContextHealth.mockReturnValue({
      health: {
        status: "critical",
        percentage: 85,
        tokensUsed: 850,
        tokensRemaining: 150,
        messageCount: 20,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    render(<ContextCriticalAlert />);

    expect(screen.getByTestId("context-critical-alert")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: DISMISS_ALERT_PATTERN })
    );

    expect(
      screen.queryByTestId("context-critical-alert")
    ).not.toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "critical",
        percentage: 85,
        tokensUsed: 850,
        tokensRemaining: 150,
        messageCount: 20,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    render(<ContextCriticalAlert />);

    const alert = screen.getByTestId("context-critical-alert");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveAttribute("data-slot", "context-critical-alert");
  });
});
