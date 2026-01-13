/**
 * Migration Dialog Tests (Story 5.5 Task 8.8)
 *
 * Tests for the MigrationDialog component.
 * 18 tests as specified in story.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMigrationStore } from "@/stores/migration";
import { MigrationDialog } from "../migration-dialog";

// Mock the useMigration hook with computed properties
vi.mock("@/hooks/use-migration", () => ({
  useMigration: () => {
    const state = useMigrationStore.getState();
    return {
      ...state,
      isInProgress: state.status === "in-progress",
    };
  },
}));

describe("MigrationDialog (Story 5.5 Task 8)", () => {
  beforeEach(() => {
    act(() => {
      useMigrationStore.getState().reset();
    });
  });

  // Test 1: Not rendered when showDialog is false
  it("should not render when showDialog is false", () => {
    render(<MigrationDialog />);
    expect(
      screen.queryByText("What would you like to do with your local data?")
    ).not.toBeInTheDocument();
  });

  // Test 2: Renders when showDialog is true
  it("should render dialog when showDialog is true", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(
      screen.getByText("What would you like to do with your local data?")
    ).toBeInTheDocument();
  });

  // Test 3: Shows anonymous session count
  it("should display anonymous session count", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(3);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument();
  });

  // Test 4: Shows singular "session" for count of 1
  it("should show singular session for count of 1", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(1);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(screen.getByText(/1 session/)).toBeInTheDocument();
  });

  // Test 5: Displays three migration options
  it("should display three migration options", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(screen.getByText("Merge Data")).toBeInTheDocument();
    expect(screen.getByText("Keep Separate")).toBeInTheDocument();
    expect(screen.getByText("Discard Local")).toBeInTheDocument();
  });

  // Test 6: Continue button disabled when no choice selected
  it("should disable Continue button when no choice selected", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  // Test 7: Continue button enabled when choice selected
  it("should enable Continue button when choice is selected", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);

    // Select merge option
    const mergeOption = screen.getByLabelText(/Merge Data/);
    fireEvent.click(mergeOption);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  // Test 8: Radio button selection works
  it("should allow selecting migration options", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);

    const mergeRadio = screen.getByRole("radio", { name: /Merge Data/i });
    fireEvent.click(mergeRadio);
    expect(mergeRadio).toBeChecked();
  });

  // Test 9: Cancel button exists
  it("should have a Cancel button", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  // Test 10: Has proper ARIA labels
  it("should have proper ARIA labels for accessibility", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-label",
      "Migration options"
    );
  });

  // Test 11: Shows progress view during migration
  it("should show progress view when migration is in progress", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
      useMigrationStore.getState().startMigration("merge", 5);
    });

    render(<MigrationDialog />);
    expect(screen.getByText("Migrating Your Data")).toBeInTheDocument();
  });

  // Test 12: Shows result view after completion
  it("should show result view when migration completes", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
      useMigrationStore.getState().completeMigration({
        success: true,
        sessionsMigrated: 5,
        completedAt: new Date(),
      });
    });

    render(<MigrationDialog />);
    expect(screen.getByText("Migration Complete")).toBeInTheDocument();
  });

  // Test 13: Shows failure view on error
  it("should show failure view when migration fails", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
      useMigrationStore.getState().failMigration("Test error");
    });

    render(<MigrationDialog />);
    expect(screen.getByText("Migration Failed")).toBeInTheDocument();
  });

  // Test 14: Options have descriptions
  it("should display option descriptions", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);
    expect(
      screen.getByText(/Combine your local sessions with your account/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Start fresh with your account/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Delete all local sessions/)).toBeInTheDocument();
  });

  // Test 15: Can select each option
  it("should allow selecting keep-separate option", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);

    const keepSeparateRadio = screen.getByRole("radio", {
      name: /Keep Separate/i,
    });
    fireEvent.click(keepSeparateRadio);
    expect(keepSeparateRadio).toBeChecked();
  });

  // Test 16: Can select discard option
  it("should allow selecting discard option", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);

    const discardRadio = screen.getByRole("radio", { name: /Discard Local/i });
    fireEvent.click(discardRadio);
    expect(discardRadio).toBeChecked();
  });

  // Test 17: Only one option can be selected at a time
  it("should only allow one option to be selected", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog />);

    const mergeRadio = screen.getByRole("radio", { name: /Merge Data/i });
    const keepSeparateRadio = screen.getByRole("radio", {
      name: /Keep Separate/i,
    });

    fireEvent.click(mergeRadio);
    expect(mergeRadio).toBeChecked();

    fireEvent.click(keepSeparateRadio);
    expect(keepSeparateRadio).toBeChecked();
    expect(mergeRadio).not.toBeChecked();
  });

  // Test 18: Custom className is applied
  it("should apply custom className", () => {
    act(() => {
      useMigrationStore.getState().setAnonymousSessionCount(5);
      useMigrationStore.getState().openDialog();
    });

    render(<MigrationDialog className="custom-class" />);
    // Dialog renders in a portal, use document.querySelector
    const dialogContent = document.querySelector(
      '[data-slot="dialog-content"]'
    );
    expect(dialogContent).toHaveClass("custom-class");
  });
});
