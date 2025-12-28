/**
 * Session Recovery Hook Tests
 *
 * Tests for session recovery detection and notification.
 * Story 1.7: AC #2 (session recovery), AC #5 (crash recovery)
 */

import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { useSessionStore } from "@/stores/session";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe("useSessionRecovery Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset session store state
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Recovery Detection (Task 3.2)", () => {
    it("returns wasRecovered: false when no sessions exist", () => {
      const { result } = renderHook(() => useSessionRecovery());

      expect(result.current.wasRecovered).toBe(false);
    });

    it("returns wasRecovered: true when sessions were recovered", () => {
      // Simulate recovered sessions
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-1",
            title: "Recovered session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: true,
      });

      const { result } = renderHook(() => useSessionRecovery());

      expect(result.current.wasRecovered).toBe(true);
    });

    it("calls initializeSessions on mount", () => {
      const initializeSessionsSpy = vi.fn();
      const originalInitialize = useSessionStore.getState().initializeSessions;

      useSessionStore.setState({
        initializeSessions: initializeSessionsSpy,
      });

      renderHook(() => useSessionRecovery());

      expect(initializeSessionsSpy).toHaveBeenCalled();

      // Restore original
      useSessionStore.setState({
        initializeSessions: originalInitialize,
      });
    });
  });

  describe("Recovery Notification (Task 3.4)", () => {
    it("shows toast notification when sessions are recovered", () => {
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-1",
            title: "Recovered session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: true,
      });

      renderHook(() => useSessionRecovery({ showNotification: true }));

      expect(toast.info).toHaveBeenCalledWith(
        "1 session restored from previous session",
        expect.objectContaining({
          duration: 4000,
          id: "session-recovery",
        })
      );
    });

    it("shows plural message for multiple sessions", () => {
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-1",
            title: "Session 1",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "recovered-2",
            title: "Session 2",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: true,
      });

      renderHook(() => useSessionRecovery({ showNotification: true }));

      expect(toast.info).toHaveBeenCalledWith(
        "2 sessions restored from previous session",
        expect.any(Object)
      );
    });

    it("does not show notification when showNotification is false", () => {
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-1",
            title: "Recovered session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: true,
      });

      renderHook(() => useSessionRecovery({ showNotification: false }));

      expect(toast.info).not.toHaveBeenCalled();
    });

    it("does not show notification when no sessions were recovered", () => {
      useSessionStore.setState({
        sessions: [],
        wasRecovered: false,
      });

      renderHook(() => useSessionRecovery({ showNotification: true }));

      expect(toast.info).not.toHaveBeenCalled();
    });

    it("only shows notification once even on re-render", () => {
      useSessionStore.setState({
        sessions: [
          {
            id: "recovered-1",
            title: "Recovered session",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        wasRecovered: true,
      });

      const { rerender } = renderHook(() => useSessionRecovery());

      // First render should show notification
      expect(toast.info).toHaveBeenCalledTimes(1);

      // Rerender should not show again
      rerender();
      expect(toast.info).toHaveBeenCalledTimes(1);
    });
  });
});
