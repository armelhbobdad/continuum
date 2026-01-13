/**
 * Migration Progress Tests (Story 5.5 Task 9.7)
 *
 * Tests for the MigrationProgress component.
 * 12 tests as specified in story.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMigrationStore } from "@/stores/migration";
import { MigrationProgress } from "../migration-progress";

// Mock the useMigration hook
vi.mock("@/hooks/use-migration", () => ({
  useMigration: () => {
    const state = useMigrationStore.getState();
    return {
      ...state,
      isInProgress: state.status === "in-progress",
      cancelMigration: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

describe("MigrationProgress (Story 5.5 Task 9)", () => {
  beforeEach(() => {
    act(() => {
      useMigrationStore.getState().reset();
    });
  });

  // Test 1: Renders progress bar
  it("should render a progress bar", () => {
    render(<MigrationProgress />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // Test 2: Shows current step description
  it("should show current step description", () => {
    act(() => {
      useMigrationStore.getState().startMigration("merge", 5);
      useMigrationStore.getState().updateProgress({
        current: 2,
        total: 5,
        percentage: 40,
        step: "Migrating session 2 of 5",
      });
    });

    render(<MigrationProgress />);
    expect(screen.getByText("Migrating session 2 of 5")).toBeInTheDocument();
  });

  // Test 3: Shows default step when no progress
  it("should show default step when no progress available", () => {
    render(<MigrationProgress />);
    expect(screen.getByText("Preparing migration...")).toBeInTheDocument();
  });

  // Test 4: Displays percentage in progress bar
  it("should display percentage in progress bar", () => {
    act(() => {
      useMigrationStore.getState().startMigration("merge", 5);
      useMigrationStore.getState().updateProgress({
        current: 3,
        total: 5,
        percentage: 60,
        step: "Migrating...",
      });
    });

    render(<MigrationProgress />);
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  // Test 5: Displays session count progress
  it("should display session count progress", () => {
    act(() => {
      useMigrationStore.getState().startMigration("merge", 10);
      useMigrationStore.getState().updateProgress({
        current: 4,
        total: 10,
        percentage: 40,
        step: "Migrating...",
      });
    });

    render(<MigrationProgress />);
    expect(screen.getByText("4 of 10 sessions")).toBeInTheDocument();
  });

  // Test 6: Shows singular "session" for total of 1
  it("should show singular session for total of 1", () => {
    act(() => {
      useMigrationStore.getState().startMigration("merge", 1);
      useMigrationStore.getState().updateProgress({
        current: 0,
        total: 1,
        percentage: 0,
        step: "Migrating...",
      });
    });

    render(<MigrationProgress />);
    expect(screen.getByText("0 of 1 session")).toBeInTheDocument();
  });

  // Test 7: Progress bar has correct ARIA attributes
  it("should have correct ARIA attributes on progress bar", () => {
    act(() => {
      useMigrationStore.getState().startMigration("merge", 5);
      useMigrationStore.getState().updateProgress({
        current: 2,
        total: 5,
        percentage: 40,
        step: "Migrating...",
      });
    });

    render(<MigrationProgress />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "40");
  });

  // Test 8: Has ARIA live region for step announcements
  it("should have ARIA live region for step announcements", () => {
    render(<MigrationProgress />);
    const liveRegion = screen.getByText("Preparing migration...");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  // Test 9: Shows cancel button when canCancel is true
  it("should show cancel button when canCancel is true", () => {
    render(<MigrationProgress canCancel />);
    expect(
      screen.getByRole("button", { name: /cancel migration/i })
    ).toBeInTheDocument();
  });

  // Test 10: Hides cancel button when canCancel is false
  it("should hide cancel button when canCancel is false", () => {
    render(<MigrationProgress canCancel={false} />);
    expect(
      screen.queryByRole("button", { name: /cancel/i })
    ).not.toBeInTheDocument();
  });

  // Test 11: Cancel button shows loading state when clicked
  it("should show loading state on cancel button when clicked", async () => {
    render(<MigrationProgress canCancel />);

    const cancelButton = screen.getByRole("button", {
      name: /cancel migration/i,
    });
    fireEvent.click(cancelButton);

    // Button should show cancelling state
    expect(screen.getByText(/Cancelling.../)).toBeInTheDocument();
  });

  // Test 12: Custom className is applied
  it("should apply custom className", () => {
    const { container } = render(
      <MigrationProgress className="custom-progress-class" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-progress-class");
  });
});
