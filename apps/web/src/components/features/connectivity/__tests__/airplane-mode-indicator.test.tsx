import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { AirplaneModeIndicator } from "../airplane-mode-indicator";

/**
 * AirplaneModeIndicator Component Tests
 *
 * Story 4.2: AC1 - Airplane Mode Status Badge
 * Tests visibility, accessibility, and styling of the indicator.
 */
describe("AirplaneModeIndicator", () => {
  beforeEach(() => {
    usePrivacyStore.setState({
      mode: "trusted-network",
      airplaneMode: false,
      previousMode: null,
      jazzKey: "test-key",
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  it("is hidden when airplane mode is off", () => {
    render(<AirplaneModeIndicator />);
    const indicator = screen.getByTestId("airplane-mode-indicator");
    expect(indicator).toHaveClass("opacity-0");
  });

  it("is visible when airplane mode is on", () => {
    usePrivacyStore.setState({ airplaneMode: true });
    render(<AirplaneModeIndicator />);
    const indicator = screen.getByTestId("airplane-mode-indicator");
    expect(indicator).toHaveClass("opacity-100");
  });

  it("shows Airplane text when active", () => {
    usePrivacyStore.setState({ airplaneMode: true });
    render(<AirplaneModeIndicator />);
    expect(screen.getByText("Airplane")).toBeInTheDocument();
  });

  it("uses semantic output element for accessibility", () => {
    render(<AirplaneModeIndicator />);
    const indicator = screen.getByTestId("airplane-mode-indicator");
    expect(indicator.tagName.toLowerCase()).toBe("output");
  });

  it("has aria-live polite for screen reader updates", () => {
    render(<AirplaneModeIndicator />);
    const indicator = screen.getByTestId("airplane-mode-indicator");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute("aria-atomic", "true");
  });

  it("has correct data-slot attribute", () => {
    render(<AirplaneModeIndicator />);
    expect(screen.getByTestId("airplane-mode-indicator")).toHaveAttribute(
      "data-slot",
      "airplane-mode-indicator"
    );
  });

  it("applies custom className", () => {
    render(<AirplaneModeIndicator className="custom-class" />);
    expect(screen.getByTestId("airplane-mode-indicator")).toHaveClass(
      "custom-class"
    );
  });

  it("has transition classes for animation", () => {
    render(<AirplaneModeIndicator />);
    const indicator = screen.getByTestId("airplane-mode-indicator");
    expect(indicator).toHaveClass("transition-all");
    expect(indicator).toHaveClass("duration-300");
  });
});
