/**
 * Connectivity Transition Types
 *
 * Types for managing connectivity state transitions and partial response recovery.
 * Used by useConnectivityTransition hook and related components.
 *
 * Story 4.4: Graceful Connectivity Transitions
 */

import type { PrivacyMode } from "@/stores/privacy";

/**
 * Transition state during connectivity changes.
 * - stable: No transition in progress
 * - transitioning: Change detected, debouncing
 * - recovering: Coming back online, syncing
 */
export type TransitionState = "stable" | "transitioning" | "recovering";

/**
 * Event emitted during connectivity transitions.
 */
export interface TransitionEvent {
  type: "connectivity-change" | "mode-change" | "response-interrupted";
  timestamp: number;
  previousState: { isOnline: boolean; mode: PrivacyMode };
  newState: { isOnline: boolean; mode: PrivacyMode };
  reason?: string;
}

/**
 * State for interrupted streaming responses.
 */
export interface PartialResponseState {
  messageId: string;
  sessionId: string;
  content: string;
  timestamp: number;
  error?: string;
  retryable: boolean;
}

/**
 * Notification suppression preferences.
 */
export interface NotificationPreferences {
  "mode-change-toast": boolean;
  "offline-indicator": boolean;
  "recovery-toast": boolean;
}

export type NotificationKey = keyof NotificationPreferences;
