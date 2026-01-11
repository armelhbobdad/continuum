"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectivityStore } from "@/stores/connectivity";
import { usePrivacyStore } from "@/stores/privacy";
import type {
  PartialResponseState,
  TransitionEvent,
  TransitionState,
} from "@/types/connectivity-transition";

export interface UseConnectivityTransitionResult {
  /** Current transition state */
  transitionState: TransitionState;
  /** Partial response if interrupted */
  partialResponse: PartialResponseState | null;
  /** Whether a transition is in progress */
  isTransitioning: boolean;
  /** Preserve current partial response */
  preservePartialResponse: (
    messageId: string,
    sessionId: string,
    content: string
  ) => void;
  /** Retry interrupted response */
  retryPartialResponse: () => Promise<void>;
  /** Clear partial response after handling */
  clearPartialResponse: () => void;
  /** Subscribe to transition events */
  onTransitionEvent: (callback: (event: TransitionEvent) => void) => () => void;
}

/**
 * useConnectivityTransition
 *
 * Manages connectivity state transitions and partial response recovery.
 * Ensures graceful handling of online/offline changes.
 *
 * Story 4.4: AC1, AC3, AC4
 */
export function useConnectivityTransition(): UseConnectivityTransitionResult {
  const { isOnline } = useConnectivityStore();
  const { mode } = usePrivacyStore();

  const [transitionState, setTransitionState] =
    useState<TransitionState>("stable");
  const [partialResponse, setPartialResponse] =
    useState<PartialResponseState | null>(null);

  const previousStateRef = useRef({ isOnline, mode });
  const eventListenersRef = useRef<Set<(event: TransitionEvent) => void>>(
    new Set()
  );
  const transitionTimerRef = useRef<number | undefined>(undefined);
  const recoveryTimerRef = useRef<number | undefined>(undefined);

  // Emit transition events
  const emitEvent = useCallback((event: TransitionEvent) => {
    for (const listener of eventListenersRef.current) {
      listener(event);
    }
  }, []);

  // Track connectivity changes
  useEffect(() => {
    const prevState = previousStateRef.current;

    if (prevState.isOnline !== isOnline || prevState.mode !== mode) {
      // Clear any pending timers
      if (transitionTimerRef.current !== undefined) {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (recoveryTimerRef.current !== undefined) {
        window.clearTimeout(recoveryTimerRef.current);
      }

      // Transition detected
      setTransitionState("transitioning");

      const event: TransitionEvent = {
        type:
          prevState.isOnline !== isOnline
            ? "connectivity-change"
            : "mode-change",
        timestamp: Date.now(),
        previousState: { isOnline: prevState.isOnline, mode: prevState.mode },
        newState: { isOnline, mode },
      };

      emitEvent(event);

      // After debounce period, mark as stable or recovering
      transitionTimerRef.current = window.setTimeout(() => {
        if (!prevState.isOnline && isOnline) {
          // Coming back online - enter recovery state
          setTransitionState("recovering");
          // After recovery period, go stable
          recoveryTimerRef.current = window.setTimeout(() => {
            setTransitionState("stable");
          }, 2000);
        } else {
          // Going offline or mode change - go straight to stable
          setTransitionState("stable");
        }
      }, 500);

      previousStateRef.current = { isOnline, mode };
    }

    return () => {
      if (transitionTimerRef.current !== undefined) {
        window.clearTimeout(transitionTimerRef.current);
      }
      if (recoveryTimerRef.current !== undefined) {
        window.clearTimeout(recoveryTimerRef.current);
      }
    };
  }, [isOnline, mode, emitEvent]);

  const preservePartialResponse = useCallback(
    (messageId: string, sessionId: string, content: string) => {
      setPartialResponse({
        messageId,
        sessionId,
        content,
        timestamp: Date.now(),
        retryable: true,
      });

      // Emit interruption event
      emitEvent({
        type: "response-interrupted",
        timestamp: Date.now(),
        previousState: previousStateRef.current,
        newState: { isOnline, mode },
        reason: "Connectivity lost during response",
      });
    },
    [isOnline, mode, emitEvent]
  );

  const retryPartialResponse = useCallback(async () => {
    if (!(partialResponse && isOnline)) {
      return;
    }

    // Mark as not retryable while attempting
    setPartialResponse((prev) => (prev ? { ...prev, retryable: false } : null));

    // Implementation would integrate with inference system
    // For now, this is a placeholder for retry logic
    try {
      // Retry logic would go here - integrate with inference adapter
      // await inferenceAdapter.retry(partialResponse.messageId);
      setPartialResponse(null);
    } catch (error) {
      setPartialResponse((prev) =>
        prev
          ? {
              ...prev,
              retryable: true,
              error: error instanceof Error ? error.message : "Retry failed",
            }
          : null
      );
    }
  }, [partialResponse, isOnline]);

  const clearPartialResponse = useCallback(() => {
    setPartialResponse(null);
  }, []);

  const onTransitionEvent = useCallback(
    (callback: (event: TransitionEvent) => void) => {
      eventListenersRef.current.add(callback);
      return () => {
        eventListenersRef.current.delete(callback);
      };
    },
    []
  );

  return {
    transitionState,
    partialResponse,
    isTransitioning: transitionState !== "stable",
    preservePartialResponse,
    retryPartialResponse,
    clearPartialResponse,
    onTransitionEvent,
  };
}
