import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { OfflineIndicator } from "../offline-indicator";

/** Regex pattern to verify amber/warning styling */
const AMBER_CLASS_PATTERN = /amber/;

/**
 * OfflineIndicator Component Tests
 *
 * Story 4.1: AC2 - Offline Badge Display
 * Tests visual states and accessibility of the offline indicator.
 */
describe("OfflineIndicator", () => {
  beforeEach(() => {
    // Reset connectivity store to online/stable state
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
    });
  });

  it("is hidden when online and stable", () => {
    render(<OfflineIndicator />);
    const indicator = screen.getByTestId("offline-indicator");
    expect(indicator).toHaveAttribute("data-status", "online");
    expect(indicator).toHaveClass("opacity-0");
  });

  it("shows Offline badge when offline", () => {
    useConnectivityStore.setState({ isOnline: false });
    render(<OfflineIndicator />);

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByTestId("offline-indicator")).toHaveAttribute(
      "data-status",
      "offline"
    );
  });

  it("shows Connecting badge when unstable", () => {
    useConnectivityStore.setState({ isStable: false });
    render(<OfflineIndicator />);

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    expect(screen.getByTestId("offline-indicator")).toHaveAttribute(
      "data-status",
      "unstable"
    );
  });

  it("shows Online badge when alwaysShow is true", () => {
    render(<OfflineIndicator alwaysShow />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    useConnectivityStore.setState({ isOnline: false });
    render(<OfflineIndicator />);

    const indicator = screen.getByTestId("offline-indicator");
    // Uses semantic <output> element which has implicit role="status"
    expect(indicator.tagName.toLowerCase()).toBe("output");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute("aria-atomic", "true");
  });

  it("renders data-slot for styling hooks", () => {
    render(<OfflineIndicator />);
    expect(screen.getByTestId("offline-indicator")).toHaveAttribute(
      "data-slot",
      "offline-indicator"
    );
  });

  it("applies custom className", () => {
    render(<OfflineIndicator className="custom-class" />);
    expect(screen.getByTestId("offline-indicator")).toHaveClass("custom-class");
  });

  it("uses amber styling for offline state", () => {
    useConnectivityStore.setState({ isOnline: false });
    render(<OfflineIndicator />);

    const indicator = screen.getByTestId("offline-indicator");
    // Check for amber/warning color class
    expect(indicator.className).toMatch(AMBER_CLASS_PATTERN);
  });
});
