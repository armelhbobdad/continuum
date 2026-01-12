/**
 * OAuthFlow Component Tests (Story 5.3, AC1-AC4)
 *
 * Tests for the OAuth authentication flow UI component.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OAuthProgress } from "@/types";
import { DEFAULT_OAUTH_PROGRESS } from "@/types";

// Mock useOAuthFlow hook
const mockStartOAuth = vi.fn();
const mockSubmitManualCode = vi.fn();
const mockCancelOAuth = vi.fn();
const mockRetryOAuth = vi.fn();
const mockFallbackToManualEntry = vi.fn();

const mockUseOAuthFlow = vi.fn();

vi.mock("@/hooks", () => ({
  useOAuthFlow: () => mockUseOAuthFlow(),
}));

// Import after mocking
import { OAuthFlow } from "../oauth-flow";

// Helper to create progress
const createProgress = (
  stateType: string,
  extra: Record<string, unknown> = {}
): OAuthProgress => ({
  state: { type: stateType, ...extra } as OAuthProgress["state"],
  step_description: `Step for ${stateType}`,
  current_step: 1,
  total_steps: 4,
  started_at: Date.now(),
  timeout_at: null,
  cancellable: true,
});

describe("OAuthFlow", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock state
    mockUseOAuthFlow.mockReturnValue({
      progress: DEFAULT_OAUTH_PROGRESS,
      isLoading: false,
      isComplete: false,
      isFailed: false,
      currentStep: 0,
      stepDescription: "Ready to sign in",
      error: null,
      errorMessage: null,
      canRetry: false,
      timeoutRemaining: null,
      startOAuth: mockStartOAuth,
      submitManualCode: mockSubmitManualCode,
      cancelOAuth: mockCancelOAuth,
      retryOAuth: mockRetryOAuth,
      fallbackToManualEntry: mockFallbackToManualEntry,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Initial State", () => {
    it("should start OAuth flow on mount", async () => {
      render(<OAuthFlow provider="google" />);

      await waitFor(() => {
        expect(mockStartOAuth).toHaveBeenCalledWith("google");
      });
    });

    it("should show loading state when in progress", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting for callback",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 30_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByText("Signing In")).toBeInTheDocument();
    });
  });

  describe("Progress Display", () => {
    it("should display step description", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Processing authentication...",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 25_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(
        screen.getByText("Processing authentication...")
      ).toBeInTheDocument();
    });

    it("should show timeout countdown when waiting", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting for callback",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 25_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByText(/Waiting for response/)).toBeInTheDocument();
      expect(screen.getByText(/25s/)).toBeInTheDocument();
    });

    it("should show local server port when in local server mode", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingLocalServer", {
          port: 9876,
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 2,
        stepDescription: "Using local server",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 28_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByText("9876")).toBeInTheDocument();
    });
  });

  describe("Cancel Action", () => {
    it("should show cancel button when cancellable", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: { ...DEFAULT_OAUTH_PROGRESS, cancellable: true },
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("should call onCancel when cancel button clicked", async () => {
      const onCancel = vi.fn();
      mockCancelOAuth.mockResolvedValue(undefined);

      mockUseOAuthFlow.mockReturnValue({
        progress: { ...DEFAULT_OAUTH_PROGRESS, cancellable: true },
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockCancelOAuth).toHaveBeenCalled();
    });
  });

  describe("Manual Entry Fallback", () => {
    it("should show manual entry button during deep link wait", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 25_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(
        screen.getByRole("button", { name: "Enter Code Manually" })
      ).toBeInTheDocument();
    });

    it("should call fallbackToManualEntry when clicked", async () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 25_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      await user.click(
        screen.getByRole("button", { name: "Enter Code Manually" })
      );

      expect(mockFallbackToManualEntry).toHaveBeenCalled();
    });
  });

  describe("Completion State", () => {
    it("should show success message when complete", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("Complete"),
        isLoading: false,
        isComplete: true,
        isFailed: false,
        currentStep: 4,
        stepDescription: "Complete",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByText("Sign-in Complete")).toBeInTheDocument();
      expect(
        screen.getByText("You have been successfully authenticated.")
      ).toBeInTheDocument();
    });

    it("should call onComplete callback when flow completes", async () => {
      const onComplete = vi.fn();

      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("Complete"),
        isLoading: false,
        isComplete: true,
        isFailed: false,
        currentStep: 4,
        stepDescription: "Complete",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow onComplete={onComplete} />);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe("Error State", () => {
    it("should show error component when flow fails", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("Failed", {
          error: { type: "NetworkError", message: "Connection lost" },
        }),
        isLoading: false,
        isComplete: false,
        isFailed: true,
        currentStep: 1,
        stepDescription: "Failed",
        error: { type: "NetworkError", message: "Connection lost" },
        errorMessage: "Network error: Connection lost",
        canRetry: true,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Manual Entry State", () => {
    it("should show manual code entry when in AwaitingManualEntry state", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingManualEntry", {
          started_at: Date.now(),
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 3,
        stepDescription: "Waiting for code",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: null,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(screen.getByText("Enter Authorization Code")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria attributes for progress", () => {
      mockUseOAuthFlow.mockReturnValue({
        progress: createProgress("AwaitingDeepLink", {
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        }),
        isLoading: true,
        isComplete: false,
        isFailed: false,
        currentStep: 1,
        stepDescription: "Waiting",
        error: null,
        errorMessage: null,
        canRetry: false,
        timeoutRemaining: 25_000,
        startOAuth: mockStartOAuth,
        submitManualCode: mockSubmitManualCode,
        cancelOAuth: mockCancelOAuth,
        retryOAuth: mockRetryOAuth,
        fallbackToManualEntry: mockFallbackToManualEntry,
      });

      render(<OAuthFlow />);

      expect(
        screen.getByRole("region", { name: /OAuth authentication/i })
      ).toBeInTheDocument();
    });
  });
});
