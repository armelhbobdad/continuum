import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConnectivityStore } from "@/stores/connectivity";
import { SyncStatusIndicator } from "../sync-status-indicator";

/**
 * SyncStatusIndicator Component Tests
 *
 * Story 4.5: AC5 - Sync status display
 * Tests visual states and accessibility of the sync status indicator.
 */
describe("SyncStatusIndicator", () => {
  beforeEach(() => {
    // Reset connectivity store to default state
    useConnectivityStore.setState({
      isOnline: true,
      isSyncing: false,
      pendingSyncCount: 0,
    });
  });

  it("is hidden when idle (no sync, no pending)", () => {
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
      "data-status",
      "idle"
    );
  });

  it("shows Syncing when isSyncing is true", () => {
    useConnectivityStore.setState({ isSyncing: true });
    render(<SyncStatusIndicator />);

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
      "data-status",
      "syncing"
    );
  });

  it("shows pending count when offline with queue", () => {
    useConnectivityStore.setState({ isOnline: false, pendingSyncCount: 3 });
    render(<SyncStatusIndicator />);

    expect(screen.getByText("3 pending")).toBeInTheDocument();
    expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
      "data-status",
      "pending"
    );
  });

  it("prioritizes syncing state over pending count", () => {
    useConnectivityStore.setState({
      isSyncing: true,
      isOnline: true,
      pendingSyncCount: 5,
    });
    render(<SyncStatusIndicator />);

    // Should show syncing, not pending count
    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    expect(screen.queryByText("5 pending")).not.toBeInTheDocument();
  });

  it("does not show pending count when online", () => {
    useConnectivityStore.setState({ isOnline: true, pendingSyncCount: 3 });
    render(<SyncStatusIndicator />);

    expect(screen.queryByText("3 pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
      "data-status",
      "idle"
    );
  });

  it("has correct accessibility attributes", () => {
    useConnectivityStore.setState({ isSyncing: true });
    render(<SyncStatusIndicator />);

    const indicator = screen.getByTestId("sync-status-indicator");
    expect(indicator).toHaveAttribute("role", "status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute("aria-atomic", "true");
  });

  it("has correct data-slot attribute", () => {
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
      "data-slot",
      "sync-status-indicator"
    );
  });

  it("applies custom className", () => {
    render(<SyncStatusIndicator className="custom-class" />);
    expect(screen.getByTestId("sync-status-indicator")).toHaveClass(
      "custom-class"
    );
  });
});
