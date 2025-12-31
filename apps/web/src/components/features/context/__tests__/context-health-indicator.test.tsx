/**
 * Context Health Indicator Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 9.1: Tests for indicator component
 * AC: All
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextHealthIndicator } from "../context-health-indicator";

// Mock the hook
vi.mock("@/hooks/use-context-health", () => ({
  useContextHealth: vi.fn(),
}));

import { useContextHealth } from "@/hooks/use-context-health";

const mockUseContextHealth = useContextHealth as ReturnType<typeof vi.fn>;

describe("ContextHealthIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no health data", () => {
    mockUseContextHealth.mockReturnValue({
      health: null,
      metrics: null,
      modelContextLength: 4096,
      isLoading: false,
    });

    const { container } = render(<ContextHealthIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when loading", () => {
    mockUseContextHealth.mockReturnValue({
      health: null,
      metrics: null,
      modelContextLength: 4096,
      isLoading: true,
    });

    const { container } = render(<ContextHealthIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no messages", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "healthy",
        percentage: 0,
        tokensUsed: 0,
        tokensRemaining: 1000,
        messageCount: 0,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    const { container } = render(<ContextHealthIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders healthy status with green color", () => {
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

    render(<ContextHealthIndicator />);

    const indicator = screen.getByTestId("context-health-indicator");
    expect(indicator).toHaveClass("bg-green-100");
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders growing status with yellow color", () => {
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

    render(<ContextHealthIndicator />);

    const indicator = screen.getByTestId("context-health-indicator");
    expect(indicator).toHaveClass("bg-yellow-100");
  });

  it("renders critical status with red color", () => {
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

    render(<ContextHealthIndicator />);

    const indicator = screen.getByTestId("context-health-indicator");
    expect(indicator).toHaveClass("bg-red-100");
  });

  it("has correct accessibility attributes", () => {
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

    render(<ContextHealthIndicator />);

    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute(
      "aria-label",
      expect.stringContaining("healthy")
    );
    expect(indicator).toHaveAttribute(
      "aria-label",
      expect.stringContaining("30%")
    );
  });

  it("has data-slot for styling hooks", () => {
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

    render(<ContextHealthIndicator />);

    const indicator = screen.getByTestId("context-health-indicator");
    expect(indicator).toHaveAttribute("data-slot", "context-health-indicator");
  });

  it("rounds percentage to nearest integer", () => {
    mockUseContextHealth.mockReturnValue({
      health: {
        status: "healthy",
        percentage: 33.7,
        tokensUsed: 337,
        tokensRemaining: 663,
        messageCount: 5,
        maxContextLength: 1000,
      },
      metrics: null,
      modelContextLength: 1000,
      isLoading: false,
    });

    render(<ContextHealthIndicator />);

    expect(screen.getByText("34%")).toBeInTheDocument();
  });
});
