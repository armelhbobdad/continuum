/**
 * PreFlightDialog Component Tests
 *
 * Tests for the dialog wrapper that shows pre-flight checklist
 * before enabling Airplane Mode.
 *
 * Story 4.3: Pre-Flight Readiness Checklist (AC5 - Integration)
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreFlightDialog } from "../preflight-dialog";

// Mock the hook at module level
vi.mock("@/hooks/use-preflight-checks", () => ({
  usePreFlightChecks: vi.fn(() => ({
    checks: [],
    isLoading: false,
    error: null,
    overallStatus: "ready",
    runChecks: vi.fn(),
    rerunCheck: vi.fn(),
  })),
}));

// Import the mocked hook
import { usePreFlightChecks } from "@/hooks/use-preflight-checks";

describe("PreFlightDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders dialog with checklist when open", () => {
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
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("does not render dialog content when closed", () => {
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

    render(
      <PreFlightDialog
        onOpenChange={vi.fn()}
        onProceed={vi.fn()}
        onSkip={vi.fn()}
        open={false}
      />
    );

    // Dialog content should not be rendered when open=false
    expect(screen.queryByTestId("preflight-dialog")).not.toBeInTheDocument();
  });

  it("calls onSkip and closes dialog when Skip button clicked", () => {
    const onSkip = vi.fn();
    const onOpenChange = vi.fn();

    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("calls onProceed and closes dialog when Proceed button clicked", () => {
    const onProceed = vi.fn();
    const onOpenChange = vi.fn();

    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("shows 'Enable Airplane Mode' button for ready status", () => {
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("shows 'Proceed Anyway' button for critical status", () => {
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
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("has correct data-slot attribute", () => {
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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

  it("renders Skip and primary action buttons", () => {
    vi.mocked(usePreFlightChecks).mockReturnValue({
      checks: [],
      isLoading: false,
      error: null,
      overallStatus: "ready",
      runChecks: vi.fn(),
      rerunCheck: vi.fn(),
    });

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
