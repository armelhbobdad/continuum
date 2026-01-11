/**
 * PreFlightCheckItem Component Tests
 *
 * Tests for the individual check item display component.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PreFlightCheck } from "@/types/preflight";
import { PreFlightCheckItem } from "../preflight-check-item";

const createMockCheck = (
  overrides: Partial<PreFlightCheck> = {}
): PreFlightCheck => ({
  id: "test-check",
  category: "model",
  name: "Test Check",
  status: "ready",
  message: "Test message",
  ...overrides,
});

describe("PreFlightCheckItem", () => {
  it("renders check name and message", () => {
    const check = createMockCheck({
      name: "AI Model",
      message: "Phi-4 downloaded and verified",
    });

    render(<PreFlightCheckItem check={check} />);

    expect(screen.getByText("AI Model")).toBeInTheDocument();
    expect(
      screen.getByText("Phi-4 downloaded and verified")
    ).toBeInTheDocument();
  });

  it("displays ready status with checkmark styling", () => {
    const check = createMockCheck({ status: "ready" });

    render(<PreFlightCheckItem check={check} />);

    const item = screen.getByTestId("preflight-check-test-check");
    expect(item).toHaveAttribute("data-status", "ready");
  });

  it("displays warning status with amber styling", () => {
    const check = createMockCheck({ status: "warning" });

    render(<PreFlightCheckItem check={check} />);

    const item = screen.getByTestId("preflight-check-test-check");
    expect(item).toHaveAttribute("data-status", "warning");
  });

  it("displays critical status with red styling", () => {
    const check = createMockCheck({ status: "critical" });

    render(<PreFlightCheckItem check={check} />);

    const item = screen.getByTestId("preflight-check-test-check");
    expect(item).toHaveAttribute("data-status", "critical");
  });

  it("displays checking status with loading animation", () => {
    const check = createMockCheck({ status: "checking" });

    render(<PreFlightCheckItem check={check} />);

    const item = screen.getByTestId("preflight-check-test-check");
    expect(item).toHaveAttribute("data-status", "checking");
  });

  it("renders details when provided", () => {
    const check = createMockCheck({
      details: "Consider freeing up space",
    });

    render(<PreFlightCheckItem check={check} />);

    expect(screen.getByText("Consider freeing up space")).toBeInTheDocument();
  });

  it("renders action button when action.onClick provided", () => {
    const onClick = vi.fn();
    const check = createMockCheck({
      action: { label: "Verify", onClick },
    });

    render(<PreFlightCheckItem check={check} />);

    const button = screen.getByRole("button", { name: "Verify" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it("renders action link when action.href provided", () => {
    const check = createMockCheck({
      action: { label: "Download", href: "/models" },
    });

    render(<PreFlightCheckItem check={check} />);

    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/models");
  });

  it("calls onAction callback after action click", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    const onAction = vi.fn();
    const check = createMockCheck({
      action: { label: "Verify", onClick },
    });

    render(<PreFlightCheckItem check={check} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    // Wait for async handleAction to complete
    await vi.waitFor(() => {
      expect(onClick).toHaveBeenCalled();
      expect(onAction).toHaveBeenCalled();
    });
  });

  it("has correct data-slot attribute", () => {
    const check = createMockCheck();

    render(<PreFlightCheckItem check={check} />);

    const item = screen.getByTestId("preflight-check-test-check");
    expect(item).toHaveAttribute("data-slot", "preflight-check-item");
  });
});
