import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PartialResponseState,
  TransitionEvent,
} from "@/types/connectivity-transition";

// Mock stores and hooks
vi.mock("@/stores/connectivity", () => ({
  useConnectivityStore: vi.fn(),
}));

vi.mock("@/stores/privacy", () => ({
  usePrivacyStore: vi.fn(),
}));

vi.mock("@/hooks/use-notification-preference", () => ({
  useNotificationPreference: vi.fn(),
}));

vi.mock("@/hooks/use-connectivity-transition", () => ({
  useConnectivityTransition: vi.fn(),
}));

/**
 * Connectivity Transition Integration Tests
 *
 * Story 4.4: All ACs
 * Tests for complete connectivity transition workflows.
 */
describe("Connectivity Transition Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Full transition flow: online → offline → online", () => {
    it("transitions gracefully when going offline", async () => {
      const { useConnectivityTransition } = await import(
        "@/hooks/use-connectivity-transition"
      );

      let transitionState = "stable";
      vi.mocked(useConnectivityTransition).mockImplementation(() => ({
        transitionState: transitionState as
          | "stable"
          | "transitioning"
          | "recovering",
        partialResponse: null,
        isTransitioning: transitionState !== "stable",
        preservePartialResponse: vi.fn(),
        retryPartialResponse: vi.fn(),
        clearPartialResponse: vi.fn(),
        onTransitionEvent: vi.fn(() => vi.fn()),
      }));

      const { ConnectivityTransition } = await import(
        "../connectivity-transition"
      );
      const { rerender } = render(
        <ConnectivityTransition>
          <div>Content</div>
        </ConnectivityTransition>
      );

      // Initially stable
      expect(screen.getByTestId("connectivity-transition")).toHaveAttribute(
        "data-state",
        "stable"
      );

      // Go offline - update mock
      transitionState = "transitioning";
      vi.mocked(useConnectivityTransition).mockImplementation(() => ({
        transitionState: "transitioning",
        partialResponse: null,
        isTransitioning: true,
        preservePartialResponse: vi.fn(),
        retryPartialResponse: vi.fn(),
        clearPartialResponse: vi.fn(),
        onTransitionEvent: vi.fn(() => vi.fn()),
      }));

      rerender(
        <ConnectivityTransition>
          <div>Content</div>
        </ConnectivityTransition>
      );

      expect(screen.getByTestId("connectivity-transition")).toHaveAttribute(
        "data-state",
        "transitioning"
      );
    });

    it("shows recovery state when coming back online", async () => {
      const { useConnectivityTransition } = await import(
        "@/hooks/use-connectivity-transition"
      );

      vi.mocked(useConnectivityTransition).mockReturnValue({
        transitionState: "recovering",
        partialResponse: null,
        isTransitioning: true,
        preservePartialResponse: vi.fn(),
        retryPartialResponse: vi.fn(),
        clearPartialResponse: vi.fn(),
        onTransitionEvent: vi.fn(() => vi.fn()),
      });

      const { ConnectivityTransition } = await import(
        "../connectivity-transition"
      );
      render(
        <ConnectivityTransition>
          <div>Content</div>
        </ConnectivityTransition>
      );

      expect(screen.getByTestId("connectivity-transition")).toHaveAttribute(
        "data-state",
        "recovering"
      );
    });
  });

  describe("Mid-stream interruption and recovery", () => {
    it("displays partial response recovery UI when interrupted", async () => {
      const mockPartialResponse: PartialResponseState = {
        messageId: "msg-123",
        sessionId: "session-456",
        content: "This is partial content that was interrupted...",
        timestamp: Date.now(),
        retryable: true,
      };

      const onRetry = vi.fn();
      const onKeepPartial = vi.fn();

      const { PartialResponseRecovery } = await import(
        "../partial-response-recovery"
      );
      render(
        <PartialResponseRecovery
          isOnline={true}
          onKeepPartial={onKeepPartial}
          onRetry={onRetry}
          partialResponse={mockPartialResponse}
        />
      );

      expect(screen.getByText(/This is partial content/)).toBeInTheDocument();
      expect(screen.getByText("Response interrupted")).toBeInTheDocument();
    });

    it("enables retry when back online", async () => {
      const mockPartialResponse: PartialResponseState = {
        messageId: "msg-123",
        sessionId: "session-456",
        content: "Partial content",
        timestamp: Date.now(),
        retryable: true,
      };

      const onRetry = vi.fn();

      const { PartialResponseRecovery } = await import(
        "../partial-response-recovery"
      );
      render(
        <PartialResponseRecovery
          isOnline={true}
          onKeepPartial={vi.fn()}
          onRetry={onRetry}
          partialResponse={mockPartialResponse}
        />
      );

      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).not.toBeDisabled();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe("Notification preference persistence", () => {
    it("respects suppressed notification preferences", async () => {
      const { useNotificationPreference } = await import(
        "@/hooks/use-notification-preference"
      );
      vi.mocked(useNotificationPreference).mockReturnValue({
        isSuppressed: () => true,
        setSuppressed: vi.fn(),
        preferences: {
          "mode-change-toast": true,
          "offline-indicator": false,
          "recovery-toast": false,
        },
        resetPreferences: vi.fn(),
      });

      const mockEvent: TransitionEvent = {
        type: "connectivity-change",
        timestamp: Date.now(),
        previousState: { isOnline: true, mode: "local-only" },
        newState: { isOnline: false, mode: "local-only" },
      };

      const { ModeChangeToast } = await import("../mode-change-toast");
      const { container } = render(<ModeChangeToast event={mockEvent} />);

      // Should not render when suppressed
      expect(container.firstChild).toBeNull();
    });

    it("persists preference when don't show again is checked", async () => {
      const setSuppressed = vi.fn();
      const { useNotificationPreference } = await import(
        "@/hooks/use-notification-preference"
      );
      vi.mocked(useNotificationPreference).mockReturnValue({
        isSuppressed: () => false,
        setSuppressed,
        preferences: {
          "mode-change-toast": false,
          "offline-indicator": false,
          "recovery-toast": false,
        },
        resetPreferences: vi.fn(),
      });

      const mockEvent: TransitionEvent = {
        type: "connectivity-change",
        timestamp: Date.now(),
        previousState: { isOnline: true, mode: "local-only" },
        newState: { isOnline: false, mode: "local-only" },
      };

      const { ModeChangeToast } = await import("../mode-change-toast");
      render(<ModeChangeToast event={mockEvent} />);

      // Check the don't show again checkbox
      fireEvent.click(screen.getByRole("checkbox"));

      // Dismiss
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(setSuppressed).toHaveBeenCalledWith("mode-change-toast", true);
    });
  });

  describe("Error boundary recovery path", () => {
    function ErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
      if (shouldThrow) {
        throw new Error("Network error");
      }
      return <div>Content recovered</div>;
    }

    it("catches errors and shows recovery UI", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { ConnectivityErrorBoundary } = await import(
        "../connectivity-error-boundary"
      );
      render(
        <ConnectivityErrorBoundary>
          <ErrorThrower shouldThrow={true} />
        </ConnectivityErrorBoundary>
      );

      expect(screen.getByText(/connection interrupted/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /continue offline/i })
      ).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("recovers when retry is clicked and error is resolved", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      let shouldThrow = true;
      function ConditionalError() {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return <div>Content recovered</div>;
      }

      const { ConnectivityErrorBoundary } = await import(
        "../connectivity-error-boundary"
      );
      const { rerender } = render(
        <ConnectivityErrorBoundary>
          <ConditionalError />
        </ConnectivityErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Fix the error and retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      rerender(
        <ConnectivityErrorBoundary>
          <ConditionalError />
        </ConnectivityErrorBoundary>
      );

      expect(screen.getByText("Content recovered")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe("Mode change toast variants", () => {
    it("shows offline message for forced offline transition", async () => {
      const { useNotificationPreference } = await import(
        "@/hooks/use-notification-preference"
      );
      vi.mocked(useNotificationPreference).mockReturnValue({
        isSuppressed: () => false,
        setSuppressed: vi.fn(),
        preferences: {
          "mode-change-toast": false,
          "offline-indicator": false,
          "recovery-toast": false,
        },
        resetPreferences: vi.fn(),
      });

      const mockEvent: TransitionEvent = {
        type: "connectivity-change",
        timestamp: Date.now(),
        previousState: { isOnline: true, mode: "local-only" },
        newState: { isOnline: false, mode: "local-only" },
      };

      const { ModeChangeToast } = await import("../mode-change-toast");
      render(<ModeChangeToast event={mockEvent} />);

      expect(screen.getByText("Connectivity changed")).toBeInTheDocument();
      expect(screen.getByText(/Operating in offline mode/)).toBeInTheDocument();
    });

    it("shows recovery message when coming back online", async () => {
      const { useNotificationPreference } = await import(
        "@/hooks/use-notification-preference"
      );
      vi.mocked(useNotificationPreference).mockReturnValue({
        isSuppressed: () => false,
        setSuppressed: vi.fn(),
        preferences: {
          "mode-change-toast": false,
          "offline-indicator": false,
          "recovery-toast": false,
        },
        resetPreferences: vi.fn(),
      });

      const mockEvent: TransitionEvent = {
        type: "connectivity-change",
        timestamp: Date.now(),
        previousState: { isOnline: false, mode: "local-only" },
        newState: { isOnline: true, mode: "local-only" },
      };

      const { ModeChangeToast } = await import("../mode-change-toast");
      render(<ModeChangeToast event={mockEvent} />);

      expect(screen.getByText("Back online")).toBeInTheDocument();
      expect(screen.getByText(/syncing now/)).toBeInTheDocument();
    });
  });
});
