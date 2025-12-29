/**
 * Session Recovery Hook
 *
 * Detects when sessions are recovered from localStorage on app startup.
 * Shows optional notification and triggers analytics event.
 *
 * Story 1.7: Session Persistence & Auto-Save
 * Task 3.4: Show recovery notification on startup
 * Task 3.5: Add sessionRecovered event for analytics (future)
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSessionStore } from "@/stores/session";

/**
 * Options for session recovery hook.
 */
type UseSessionRecoveryOptions = {
  /** Whether to show toast notification on recovery */
  showNotification?: boolean;
};

/**
 * Hook for detecting and handling session recovery.
 *
 * Should be called once at app root to initialize recovery detection.
 * Shows a notification if sessions were recovered from previous session.
 *
 * @param options - Configuration options
 * @returns Object with recovery state
 */
export function useSessionRecovery(options: UseSessionRecoveryOptions = {}): {
  wasRecovered: boolean;
} {
  const { showNotification = true } = options;
  const wasRecovered = useSessionStore((state) => state.wasRecovered);
  const sessions = useSessionStore((state) => state.sessions);
  const initializeSessions = useSessionStore(
    (state) => state.initializeSessions
  );

  // Track if we've already shown the notification
  const hasNotifiedRef = useRef(false);

  // Initialize sessions on first mount
  useEffect(() => {
    initializeSessions();
  }, [initializeSessions]);

  // Show notification when recovery is detected
  useEffect(() => {
    if (wasRecovered && showNotification && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;

      const sessionCount = sessions.length;
      const message =
        sessionCount === 1
          ? "1 session restored from previous session"
          : `${sessionCount} sessions restored from previous session`;

      toast.info(message, {
        duration: 4000,
        id: "session-recovery",
      });

      // Task 3.5: Analytics event (future implementation)
      // dispatchEvent(new CustomEvent('sessionRecovered', { detail: { count: sessionCount } }));
    }
  }, [wasRecovered, sessions.length, showNotification]);

  return { wasRecovered };
}
