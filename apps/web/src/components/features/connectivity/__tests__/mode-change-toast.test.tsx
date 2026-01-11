import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransitionEvent } from "@/types/connectivity-transition";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the hook
vi.mock("@/hooks/use-notification-preference", () => ({
  useNotificationPreference: vi.fn(),
}));

/**
 * ModeChangeToast Component Tests
 *
 * Story 4.4: AC4, AC5
 * Tests toast display, suppression, and dismissal behavior.
 */
describe("ModeChangeToast", () => {
  const mockEvent: TransitionEvent = {
    type: "connectivity-change",
    timestamp: Date.now(),
    previousState: { isOnline: true, mode: "local-only" },
    newState: { isOnline: false, mode: "local-only" },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders toast with correct message for going offline (forced)", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} />);

    expect(screen.getByText("Connectivity changed")).toBeInTheDocument();
    expect(screen.getByText(/Operating in offline mode/)).toBeInTheDocument();
  });

  it("renders recovery message when coming back online", async () => {
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

    const recoveryEvent: TransitionEvent = {
      type: "connectivity-change",
      timestamp: Date.now(),
      previousState: { isOnline: false, mode: "local-only" },
      newState: { isOnline: true, mode: "local-only" },
    };

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={recoveryEvent} />);

    expect(screen.getByText("Back online")).toBeInTheDocument();
    expect(screen.getByText(/syncing now/)).toBeInTheDocument();
  });

  it("renders graceful message for mode change while online", async () => {
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

    const modeChangeEvent: TransitionEvent = {
      type: "mode-change",
      timestamp: Date.now(),
      previousState: { isOnline: true, mode: "local-only" },
      newState: { isOnline: true, mode: "cloud-enhanced" },
    };

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={modeChangeEvent} />);

    expect(screen.getByText("Switched to offline mode")).toBeInTheDocument();
  });

  it("shows don't show again checkbox", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} />);

    expect(screen.getByText(/Don't show again/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("persists preference when dismissed with checkbox checked", async () => {
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

    const onDismiss = vi.fn();
    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} onDismiss={onDismiss} />);

    // Check the checkbox
    fireEvent.click(screen.getByRole("checkbox"));

    // Dismiss via button
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(setSuppressed).toHaveBeenCalledWith("mode-change-toast", true);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not render when suppressed", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    const { container } = render(<ModeChangeToast event={mockEvent} />);

    expect(container.firstChild).toBeNull();
  });

  it("has correct data-slot attribute", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} />);

    expect(screen.getByTestId("mode-change-toast")).toHaveAttribute(
      "data-slot",
      "mode-change-toast"
    );
  });

  it("has correct accessibility attributes", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} />);

    const toast = screen.getByTestId("mode-change-toast");
    expect(toast).toHaveAttribute("role", "alert");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("applies correct variant styling for offline (amber)", async () => {
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

    const { ModeChangeToast } = await import("../mode-change-toast");
    render(<ModeChangeToast event={mockEvent} />);

    const toastElement = screen.getByTestId("mode-change-toast");
    expect(toastElement.className).toMatch(/amber/);
  });
});

/**
 * showModeChangeToast Imperative Function Tests
 *
 * Story 4.4: AC4, AC5
 * Tests for the imperative toast function using Sonner.
 */
describe("showModeChangeToast", () => {
  const STORAGE_KEY = "continuum-notification-preferences";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it("shows warning toast when going offline", async () => {
    const { toast } = await import("sonner");
    const { showModeChangeToast } = await import("../mode-change-toast");

    const offlineEvent: TransitionEvent = {
      type: "connectivity-change",
      timestamp: Date.now(),
      previousState: { isOnline: true, mode: "local-only" },
      newState: { isOnline: false, mode: "local-only" },
    };

    showModeChangeToast(offlineEvent);

    expect(toast.warning).toHaveBeenCalledWith("Connectivity changed", {
      description: expect.stringContaining("offline mode"),
      duration: 5000,
    });
  });

  it("shows success toast when coming back online", async () => {
    const { toast } = await import("sonner");
    const { showModeChangeToast } = await import("../mode-change-toast");

    const recoveryEvent: TransitionEvent = {
      type: "connectivity-change",
      timestamp: Date.now(),
      previousState: { isOnline: false, mode: "local-only" },
      newState: { isOnline: true, mode: "local-only" },
    };

    showModeChangeToast(recoveryEvent);

    expect(toast.success).toHaveBeenCalledWith("Back online", {
      description: expect.stringContaining("syncing"),
      duration: 5000,
    });
  });

  it("shows info toast for graceful mode change", async () => {
    const { toast } = await import("sonner");
    const { showModeChangeToast } = await import("../mode-change-toast");

    const modeChangeEvent: TransitionEvent = {
      type: "mode-change",
      timestamp: Date.now(),
      previousState: { isOnline: true, mode: "local-only" },
      newState: { isOnline: true, mode: "cloud-enhanced" },
    };

    showModeChangeToast(modeChangeEvent);

    expect(toast.info).toHaveBeenCalledWith("Switched to offline mode", {
      description: expect.any(String),
      duration: 5000,
    });
  });

  it("respects suppression preference from localStorage", async () => {
    const { toast } = await import("sonner");

    // Set suppression preference BEFORE importing the function
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "mode-change-toast": true })
    );

    const { showModeChangeToast } = await import("../mode-change-toast");

    const offlineEvent: TransitionEvent = {
      type: "connectivity-change",
      timestamp: Date.now(),
      previousState: { isOnline: true, mode: "local-only" },
      newState: { isOnline: false, mode: "local-only" },
    };

    showModeChangeToast(offlineEvent);

    // Should NOT call any toast method when suppressed
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
