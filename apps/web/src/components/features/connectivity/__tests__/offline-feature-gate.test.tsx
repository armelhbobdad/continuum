import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { usePrivacyStore } from "@/stores/privacy";
import { OfflineFeatureGate } from "../offline-feature-gate";

/**
 * OfflineFeatureGate Component Tests
 *
 * Story 4.5: AC4 - Cloud feature limitations
 * Tests conditional rendering based on connectivity and airplane mode.
 */
describe("OfflineFeatureGate", () => {
  beforeEach(() => {
    // Reset stores to default online state
    useConnectivityStore.setState({
      isOnline: true,
      isSyncing: false,
      pendingSyncCount: 0,
    });
    usePrivacyStore.setState({
      airplaneMode: false,
    });
  });

  it("renders children when online and requiresCloud", () => {
    render(
      <OfflineFeatureGate feature="Cloud Sync" requiresCloud>
        <button type="button">Sync Now</button>
      </OfflineFeatureGate>
    );

    expect(
      screen.getByRole("button", { name: "Sync Now" })
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("offline-feature-gate")
    ).not.toBeInTheDocument();
  });

  it("renders children when feature does not require cloud (offline)", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate feature="Local Feature" requiresCloud={false}>
        <span>Local content</span>
      </OfflineFeatureGate>
    );

    expect(screen.getByText("Local content")).toBeInTheDocument();
    expect(
      screen.queryByTestId("offline-feature-gate")
    ).not.toBeInTheDocument();
  });

  it("shows friendly message when offline and requiresCloud", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate feature="Cloud Sync" requiresCloud>
        <button type="button">Sync Now</button>
      </OfflineFeatureGate>
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTestId("offline-feature-gate")).toBeInTheDocument();
    expect(
      screen.getByText("Cloud Sync requires an internet connection")
    ).toBeInTheDocument();
  });

  it("shows local alternative suggestion when provided", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate
        feature="Cloud Search"
        localAlternative="local session history"
        requiresCloud
      >
        <span>Search</span>
      </OfflineFeatureGate>
    );

    expect(
      screen.getByText("Try local session history instead while offline")
    ).toBeInTheDocument();
  });

  it("shows airplane mode message when in airplane mode", () => {
    useConnectivityStore.setState({ isOnline: true });
    usePrivacyStore.setState({ airplaneMode: true });

    render(
      <OfflineFeatureGate feature="Cloud Backup" requiresCloud>
        <span>Backup</span>
      </OfflineFeatureGate>
    );

    expect(screen.getByTestId("offline-feature-gate")).toBeInTheDocument();
    expect(
      screen.getByText("Disable Airplane Mode to use this feature")
    ).toBeInTheDocument();
  });

  it("uses custom message when provided", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate
        feature="Premium Feature"
        message="This premium feature needs connectivity"
        requiresCloud
      >
        <span>Premium</span>
      </OfflineFeatureGate>
    );

    expect(
      screen.getByText("This premium feature needs connectivity")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Premium Feature requires an internet connection")
    ).not.toBeInTheDocument();
  });

  it("has correct data attributes", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate feature="Test Feature" requiresCloud>
        <span>Content</span>
      </OfflineFeatureGate>
    );

    const gate = screen.getByTestId("offline-feature-gate");
    expect(gate).toHaveAttribute("data-slot", "offline-feature-gate");
    expect(gate).toHaveAttribute("data-feature", "Test Feature");
  });

  it("applies custom className", () => {
    useConnectivityStore.setState({ isOnline: false });

    render(
      <OfflineFeatureGate
        className="custom-gate-class"
        feature="Test"
        requiresCloud
      >
        <span>Content</span>
      </OfflineFeatureGate>
    );

    expect(screen.getByTestId("offline-feature-gate")).toHaveClass(
      "custom-gate-class"
    );
  });
});
