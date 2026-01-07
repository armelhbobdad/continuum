/**
 * PreFlightChecklist Component Tests
 *
 * Tests for the full checklist component with all checks and summary.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreFlightCheck } from "@/types/preflight";

// Mock the hook
const mockRunChecks = vi.fn();
const mockRerunCheck = vi.fn();

vi.mock("@/hooks/use-preflight-checks", () => ({
  usePreFlightChecks: vi.fn(),
}));

const createMockChecks = (
  overrides: Partial<PreFlightCheck>[] = []
): PreFlightCheck[] => {
  const defaults: PreFlightCheck[] = [
    {
      id: "model",
      category: "model",
      name: "Model",
      status: "ready",
      message: "Ready",
    },
    {
      id: "storage",
      category: "storage",
      name: "Storage",
      status: "ready",
      message: "5GB",
    },
  ];

  return defaults.map((check, i) => ({
    ...check,
    ...(overrides[i] || {}),
  }));
};

describe("PreFlightChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunChecks.mockResolvedValue(undefined);
    mockRerunCheck.mockResolvedValue(undefined);
  });

  it("renders checklist header", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByText("Pre-Flight Check")).toBeInTheDocument();
  });

  it("shows loading state while checking", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [
        {
          id: "model",
          category: "model",
          name: "Model",
          status: "checking",
          message: "Checking...",
        },
      ],
      isLoading: true,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByTestId("preflight-check-model")).toHaveAttribute(
      "data-status",
      "checking"
    );
  });

  it("shows ready summary when all checks pass", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByText("Ready for offline!")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 checks passed")).toBeInTheDocument();
  });

  it("shows warning summary when checks have warnings", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks([{}, { status: "warning" }]),
      isLoading: false,
      error: null,
      overallStatus: "warning",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByText("Ready with warnings")).toBeInTheDocument();
  });

  it("shows critical summary when checks fail", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [
        {
          id: "model",
          category: "model",
          name: "Model",
          status: "critical",
          message: "No model",
        },
      ],
      isLoading: false,
      error: null,
      overallStatus: "critical",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByText("Some items need attention")).toBeInTheDocument();
  });

  it("calls runChecks on refresh button click", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(mockRunChecks).toHaveBeenCalled();
  });

  it("disables refresh button while loading", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: true,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it("has correct data-slot attribute", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByTestId("preflight-checklist")).toHaveAttribute(
      "data-slot",
      "preflight-checklist"
    );
  });

  it("renders all check items", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByTestId("preflight-check-model")).toBeInTheDocument();
    expect(screen.getByTestId("preflight-check-storage")).toBeInTheDocument();
  });

  it("shows encouraging message when all checks pass", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist />);

    expect(screen.getByText(/all set for offline work/i)).toBeInTheDocument();
  });

  it("calls onComplete callback with status after checks", async () => {
    const onComplete = vi.fn();
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist onComplete={onComplete} />);

    // Click refresh to trigger onComplete
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    // After runChecks completes (async), onComplete should be called
    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("ready");
    });
  });

  it("calls onStatusChange callback when status changes", async () => {
    const onStatusChange = vi.fn();
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: createMockChecks(),
      isLoading: false,
      error: null,
      overallStatus: "warning",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightChecklist } = await import("../preflight-checklist");
    render(<PreFlightChecklist onStatusChange={onStatusChange} />);

    // onStatusChange should be called with status after initial load
    await vi.waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith("warning");
    });
  });
});
