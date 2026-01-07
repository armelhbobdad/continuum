/**
 * PreFlightDialog Component Tests
 *
 * Tests for the dialog wrapper that shows pre-flight checklist
 * before enabling Airplane Mode.
 *
 * Story 4.3: Pre-Flight Readiness Checklist (AC5 - Integration)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the hook
const mockRunChecks = vi.fn();
const mockRerunCheck = vi.fn();

vi.mock("@/hooks/use-preflight-checks", () => ({
  usePreFlightChecks: vi.fn(),
}));

describe("PreFlightDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunChecks.mockResolvedValue(undefined);
    mockRerunCheck.mockResolvedValue(undefined);
  });

  it("renders dialog with checklist when open", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [
        {
          id: "model",
          category: "model",
          name: "Model",
          status: "ready",
          message: "Ready",
        },
      ],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={true}
      />
    );

    expect(screen.getByText("Pre-Flight Check")).toBeInTheDocument();
  });

  it("does not render dialog content when closed", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={false}
      />
    );

    expect(screen.queryByText("Pre-Flight Check")).not.toBeInTheDocument();
  });

  it("calls onSkip and closes dialog when Skip button clicked", async () => {
    const onSkip = vi.fn();
    const onOpenChange = vi.fn();
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={onOpenChange}
        onProceed={vi.fn()}
        onSkip={onSkip}
        open={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(onSkip).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onProceed and closes dialog when Proceed button clicked", async () => {
    const onProceed = vi.fn();
    const onOpenChange = vi.fn();
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={onOpenChange}
        onProceed={onProceed}
        onSkip={vi.fn()}
        open={true}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /enable airplane mode/i })
    );

    expect(onProceed).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows 'Enable Airplane Mode' button for ready status", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={true}
      />
    );

    expect(
      screen.getByRole("button", { name: /enable airplane mode/i })
    ).toBeInTheDocument();
  });

  it("shows 'Proceed Anyway' button for critical status", async () => {
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

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={true}
      />
    );

    expect(
      screen.getByRole("button", { name: /proceed anyway/i })
    ).toBeInTheDocument();
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

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={true}
      />
    );

    expect(screen.getByTestId("preflight-dialog")).toHaveAttribute(
      "data-slot",
      "preflight-dialog"
    );
  });

  it("renders Skip and primary action buttons", async () => {
    const { usePreFlightChecks } = await import("@/hooks/use-preflight-checks");
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: mockRunChecks,
      rerunCheck: mockRerunCheck,
    });

    const { PreFlightDialog } = await import("../preflight-dialog");
    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={true}
      />
    );

    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enable airplane mode/i })
    ).toBeInTheDocument();
  });
});
