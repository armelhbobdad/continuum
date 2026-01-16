/**
 * Migration Result Tests (Story 5.5 Task 10.6)
 *
 * Tests for the MigrationResult component.
 * 10 tests as specified in story.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MigrationResult as MigrationResultType } from "@/types/migration";
import { MigrationResult } from "../migration-result";

describe("MigrationResult (Story 5.5 Task 10)", () => {
  const mockOnComplete = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Returns null when result is null
  it("should return null when result is null", () => {
    const { container } = render(
      <MigrationResult onComplete={mockOnComplete} result={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  // Test 2: Shows success state with green styling
  it("should show success state with green styling", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 5,
      completedAt: new Date(),
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    expect(screen.getByText("Migration Successful")).toBeInTheDocument();
    const successText = screen.getByText("Migration Successful");
    expect(successText).toHaveClass("text-green-700");
  });

  // Test 3: Shows migrated session count in success state
  it("should show migrated session count in success state", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 5,
      completedAt: new Date(),
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    expect(
      screen.getByText(/Successfully migrated 5 sessions/)
    ).toBeInTheDocument();
  });

  // Test 4: Shows singular "session" for count of 1
  it("should show singular session for count of 1", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 1,
      completedAt: new Date(),
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    expect(
      screen.getByText(/Successfully migrated 1 session to/)
    ).toBeInTheDocument();
  });

  // Test 5: Shows message for zero sessions migrated
  it("should show appropriate message for zero sessions migrated", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 0,
      completedAt: new Date(),
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    expect(
      screen.getByText("No sessions needed to be migrated.")
    ).toBeInTheDocument();
  });

  // Test 6: Shows failure state with red styling
  it("should show failure state with red styling", () => {
    const result: MigrationResultType = {
      success: false,
      error: "Network error occurred",
      sessionsMigrated: 0,
    };

    render(
      <MigrationResult
        onComplete={mockOnComplete}
        onRetry={mockOnRetry}
        result={result}
      />
    );

    expect(screen.getByText("Migration Failed")).toBeInTheDocument();
    const failedText = screen.getByText("Migration Failed");
    expect(failedText).toHaveClass("text-red-700");
  });

  // Test 7: Shows error message in failure state
  it("should show error message in failure state", () => {
    const result: MigrationResultType = {
      success: false,
      error: "Database connection failed",
      sessionsMigrated: 0,
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    expect(screen.getByText("Database connection failed")).toBeInTheDocument();
  });

  // Test 8: Shows retry button when onRetry is provided
  it("should show retry button when onRetry is provided", () => {
    const result: MigrationResultType = {
      success: false,
      error: "Network error",
      sessionsMigrated: 0,
    };

    render(
      <MigrationResult
        onComplete={mockOnComplete}
        onRetry={mockOnRetry}
        result={result}
      />
    );

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  // Test 9: Calls onComplete when continue button is clicked
  it("should call onComplete when continue button is clicked", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 3,
      completedAt: new Date(),
    };

    render(<MigrationResult onComplete={mockOnComplete} result={result} />);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueButton);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  // Test 10: Custom className is applied
  it("should apply custom className", () => {
    const result: MigrationResultType = {
      success: true,
      sessionsMigrated: 3,
      completedAt: new Date(),
    };

    const { container } = render(
      <MigrationResult
        className="custom-result-class"
        onComplete={mockOnComplete}
        result={result}
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-result-class");
  });
});
