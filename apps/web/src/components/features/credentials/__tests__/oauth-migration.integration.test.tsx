/**
 * OAuth Migration Integration Tests (Story 5.5 Task 12.4)
 *
 * Tests for OAuth → Migration flow integration.
 * 8 tests as specified in story.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock state values
let mockIsOAuthComplete = false;
let mockShowMigrationDialog = false;
let mockMigrationStatus: "idle" | "in-progress" | "completed" | "failed" =
  "idle";
let mockAnonymousSessionCount = 0;

// Mock useOAuthFlow hook
const mockStartOAuth = vi.fn();
const mockCancelOAuth = vi.fn();

vi.mock("@/hooks", () => ({
  useOAuthFlow: () => ({
    progress: { state: { type: "AwaitingDeepLink" }, cancellable: true },
    isLoading: !mockIsOAuthComplete,
    isComplete: mockIsOAuthComplete,
    isFailed: false,
    currentStep: 1,
    stepDescription: "Testing...",
    error: null,
    errorMessage: null,
    canRetry: false,
    timeoutRemaining: null,
    startOAuth: mockStartOAuth,
    submitManualCode: vi.fn(),
    cancelOAuth: mockCancelOAuth,
    retryOAuth: vi.fn(),
    fallbackToManualEntry: vi.fn(),
  }),
  useMigration: () => ({
    showDialog: mockShowMigrationDialog,
    status: mockMigrationStatus,
    anonymousSessionCount: mockAnonymousSessionCount,
  }),
}));

// Mock MigrationDialog
vi.mock("@/components/features/auth/migration-dialog", () => ({
  MigrationDialog: () => (
    <div data-testid="migration-dialog">Migration Dialog</div>
  ),
}));

import { OAuthFlow } from "../oauth-flow";

describe("OAuth Migration Integration (Story 5.5 Task 12)", () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOAuthComplete = false;
    mockShowMigrationDialog = false;
    mockMigrationStatus = "idle";
    mockAnonymousSessionCount = 0;
  });

  // Test 1: Shows OAuth flow when not complete
  it("should show OAuth flow when not complete", () => {
    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    expect(screen.getByText("Signing In")).toBeInTheDocument();
    expect(screen.queryByTestId("migration-dialog")).not.toBeInTheDocument();
  });

  // Test 2: Shows migration dialog after OAuth complete with anonymous sessions
  it("should show migration dialog after OAuth complete when user has anonymous sessions", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = true;
    mockAnonymousSessionCount = 5;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    expect(screen.getByTestId("migration-dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Please choose how to handle your existing sessions.")
    ).toBeInTheDocument();
  });

  // Test 3: Does not show migration dialog if no anonymous sessions
  it("should not show migration dialog if no anonymous sessions", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = false;
    mockAnonymousSessionCount = 0;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    expect(screen.queryByTestId("migration-dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Sign-in Complete")).toBeInTheDocument();
  });

  // Test 4: Does not call onComplete until migration is handled
  it("should not call onComplete while migration dialog is shown", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = true;
    mockMigrationStatus = "idle";
    mockAnonymousSessionCount = 3;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    // onComplete should not be called while migration dialog is shown
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  // Test 5: Calls onComplete when migration is completed
  it("should call onComplete when migration is completed", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = false;
    mockMigrationStatus = "completed";
    mockAnonymousSessionCount = 0;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    // Should call onComplete since truly complete
    expect(mockOnComplete).toHaveBeenCalled();
  });

  // Test 6: Calls onComplete when migration fails (user can continue)
  it("should call onComplete when migration fails", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = false;
    mockMigrationStatus = "failed";
    mockAnonymousSessionCount = 0;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    // Should call onComplete since user can continue after failure
    expect(mockOnComplete).toHaveBeenCalled();
  });

  // Test 7: Shows blue styling during migration pending
  it("should show blue styling when migration dialog is shown", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = true;
    mockAnonymousSessionCount = 3;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    // Should show blue styling indicating pending action needed
    const output = document.querySelector("output");
    expect(output).toHaveClass("border-blue-200");
  });

  // Test 8: Shows green styling when truly complete
  it("should show green styling when truly complete", () => {
    mockIsOAuthComplete = true;
    mockShowMigrationDialog = false;
    mockMigrationStatus = "completed";
    mockAnonymousSessionCount = 0;

    render(<OAuthFlow onCancel={mockOnCancel} onComplete={mockOnComplete} />);

    // Should show green styling indicating success
    const output = document.querySelector("output");
    expect(output).toHaveClass("border-green-200");
  });
});
