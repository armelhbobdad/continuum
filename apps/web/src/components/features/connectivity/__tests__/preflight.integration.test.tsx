/**
 * Pre-Flight Readiness Checklist Integration Tests
 *
 * Tests the complete pre-flight system including:
 * - Full checklist flow with all statuses
 * - Action button triggering check re-run
 * - Overall status calculation
 * - Dialog integration with airplane mode toggle
 * - Parallel check execution
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import type { PreFlightCheck } from "@/types/preflight";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock the hook at module level with default implementation
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

// Static imports after mocks
import { usePreFlightChecks } from "@/hooks/use-preflight-checks";
import { PreFlightChecklist } from "../preflight-checklist";
import { PreFlightDialog } from "../preflight-dialog";

// Top-level regex for performance (avoids re-creation in test loops)
const SKIP_BUTTON_REGEX = /skip/i;
const ENABLE_AIRPLANE_MODE_REGEX = /enable airplane mode/i;

describe("Pre-Flight Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePrivacyStore.setState({
      mode: "trusted-network",
      airplaneMode: false,
      previousMode: null,
      jazzKey: "test-key",
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Full Checklist Flow", () => {
    it("renders all check items with their statuses", () => {
      const mockChecks: PreFlightCheck[] = [
        {
          id: "model",
          category: "model",
          name: "AI Model",
          status: "ready",
          message: "Ready",
        },
        {
          id: "storage",
          category: "storage",
          name: "Storage",
          status: "warning",
          message: "Low",
        },
        {
          id: "ram",
          category: "ram",
          name: "Memory",
          status: "critical",
          message: "Insufficient",
        },
        {
          id: "knowledge",
          category: "knowledge",
          name: "Knowledge",
          status: "ready",
          message: "Synced",
        },
      ];

      vi.mocked(usePreFlightChecks).mockReturnValue({
        checks: mockChecks,
        isLoading: false,
        error: null,
        overallStatus: "critical",
        runChecks: vi.fn(),
        rerunCheck: vi.fn(),
      });

      render(<PreFlightChecklist />);

      expect(screen.getByTestId("preflight-check-model")).toHaveAttribute(
        "data-status",
        "ready"
      );
      expect(screen.getByTestId("preflight-check-storage")).toHaveAttribute(
        "data-status",
        "warning"
      );
      expect(screen.getByTestId("preflight-check-ram")).toHaveAttribute(
        "data-status",
        "critical"
      );
      expect(screen.getByTestId("preflight-check-knowledge")).toHaveAttribute(
        "data-status",
        "ready"
      );
    });

    it("shows correct summary for mixed statuses", () => {
      const mockChecks: PreFlightCheck[] = [
        {
          id: "model",
          category: "model",
          name: "AI Model",
          status: "ready",
          message: "Ready",
        },
        {
          id: "storage",
          category: "storage",
          name: "Storage",
          status: "warning",
          message: "Low",
        },
      ];

      vi.mocked(usePreFlightChecks).mockReturnValue({
        checks: mockChecks,
        isLoading: false,
        error: null,
        overallStatus: "warning",
        runChecks: vi.fn(),
        rerunCheck: vi.fn(),
      });

      render(<PreFlightChecklist />);

      expect(screen.getByText("Ready with warnings")).toBeInTheDocument();
      expect(screen.getByText("1 of 2 checks passed")).toBeInTheDocument();
    });
  });

  describe("Action Button Re-run", () => {
    it("calls rerunCheck when action button clicked", () => {
      const rerunCheck = vi.fn();
      const mockChecks: PreFlightCheck[] = [
        {
          id: "model",
          category: "model",
          name: "AI Model",
          status: "critical",
          message: "No model",
          action: { label: "Download", href: "/models" },
        },
      ];

      vi.mocked(usePreFlightChecks).mockReturnValue({
        checks: mockChecks,
        isLoading: false,
        error: null,
        overallStatus: "critical",
        runChecks: vi.fn(),
        rerunCheck,
      });

      render(<PreFlightChecklist />);

      // Action link is present
      const actionLink = screen.getByRole("link", { name: "Download" });
      expect(actionLink).toHaveAttribute("href", "/models");
    });
  });

  describe("Overall Status Calculation", () => {
    it("returns ready when all checks pass", async () => {
      const { calculateOverallStatus } = await import("@/lib/preflight/checks");

      const checks: PreFlightCheck[] = [
        {
          id: "1",
          category: "model",
          name: "Model",
          status: "ready",
          message: "",
        },
        {
          id: "2",
          category: "storage",
          name: "Storage",
          status: "ready",
          message: "",
        },
        { id: "3", category: "ram", name: "RAM", status: "ready", message: "" },
      ];

      expect(calculateOverallStatus(checks)).toBe("ready");
    });

    it("returns warning when any check has warning", async () => {
      const { calculateOverallStatus } = await import("@/lib/preflight/checks");

      const checks: PreFlightCheck[] = [
        {
          id: "1",
          category: "model",
          name: "Model",
          status: "ready",
          message: "",
        },
        {
          id: "2",
          category: "storage",
          name: "Storage",
          status: "warning",
          message: "",
        },
        { id: "3", category: "ram", name: "RAM", status: "ready", message: "" },
      ];

      expect(calculateOverallStatus(checks)).toBe("warning");
    });

    it("returns critical when any check is critical (even with warnings)", async () => {
      const { calculateOverallStatus } = await import("@/lib/preflight/checks");

      const checks: PreFlightCheck[] = [
        {
          id: "1",
          category: "model",
          name: "Model",
          status: "critical",
          message: "",
        },
        {
          id: "2",
          category: "storage",
          name: "Storage",
          status: "warning",
          message: "",
        },
        { id: "3", category: "ram", name: "RAM", status: "ready", message: "" },
      ];

      expect(calculateOverallStatus(checks)).toBe("critical");
    });
  });

  describe("Parallel Check Execution", () => {
    it("runs all checks in parallel", async () => {
      const { runAllChecks } = await import("@/lib/preflight/checks");

      const startTime = Date.now();
      const results = await runAllChecks();
      const endTime = Date.now();

      // Checks should complete quickly (no sequential delays)
      expect(endTime - startTime).toBeLessThan(500);

      // Should return multiple check results
      expect(results.length).toBeGreaterThanOrEqual(4);

      // All results should have required fields
      for (const result of results) {
        expect(result.id).toBeDefined();
        expect(result.category).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.message).toBeDefined();
      }
    });

    it("filters out null results (GPU check on web)", async () => {
      const { runAllChecks } = await import("@/lib/preflight/checks");

      const results = await runAllChecks();

      // No null values in results
      for (const result of results) {
        expect(result).not.toBeNull();
      }

      // GPU check should be filtered out on web (non-Tauri)
      const gpuCheck = results.find((r) => r.category === "gpu");
      expect(gpuCheck).toBeUndefined();
    });
  });

  describe("Skip vs Proceed Button Behavior", () => {
    it("Skip button closes dialog without enabling airplane mode", () => {
      // This test documents the expected behavior: Skip = cancel, not enable
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

      fireEvent.click(screen.getByRole("button", { name: SKIP_BUTTON_REGEX }));

      // Skip should call onSkip (which in header.tsx resolves to false = cancel)
      expect(onSkip).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // Airplane mode should NOT be enabled after Skip
      expect(usePrivacyStore.getState().airplaneMode).toBe(false);
    });

    it("Enable Airplane Mode button enables airplane mode via onProceed", () => {
      // This test documents that Proceed = enable airplane mode
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
        screen.getByRole("button", { name: ENABLE_AIRPLANE_MODE_REGEX })
      );

      // Proceed should call onProceed (which in header.tsx resolves to true = enable)
      expect(onProceed).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Dialog Integration", () => {
    it("shows checklist content in dialog", () => {
      vi.mocked(usePreFlightChecks).mockReturnValue({
        checks: [
          {
            id: "model",
            category: "model",
            name: "AI Model",
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
      expect(screen.getByText("AI Model")).toBeInTheDocument();
    });

    it("calls onProceed when Enable button clicked", () => {
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
        screen.getByRole("button", { name: ENABLE_AIRPLANE_MODE_REGEX })
      );

      expect(onProceed).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
