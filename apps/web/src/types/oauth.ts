/**
 * OAuth Authentication Types (Story 5.3)
 *
 * Type definitions for OAuth authentication flow.
 * These types mirror the Rust backend types for IPC communication.
 *
 * SECURITY: Tokens are NEVER stored in these types - they remain in Rust.
 *
 * Story 5.3: OAuth Authentication Flow
 * - AC1: Deep link callback flow
 * - AC2: Local server fallback
 * - AC3: Manual code entry fallback
 * - AC4: Progress indicators
 * - AC5: Token storage via Credential Bridge
 * - AC6: Error handling and retry
 */

/**
 * OAuth flow state (AC1-4)
 *
 * Represents the current state of an OAuth authentication flow.
 * Uses tagged union pattern to match Rust serde serialization.
 */
export type OAuthState =
  | { type: "Idle" }
  | { type: "AwaitingDeepLink"; started_at: number; timeout_at: number }
  | {
      type: "AwaitingLocalServer";
      port: number;
      started_at: number;
      timeout_at: number;
    }
  | { type: "AwaitingManualEntry"; started_at: number }
  | { type: "ExchangingTokens" }
  | { type: "Complete" }
  | { type: "Failed"; error: OAuthError };

/**
 * OAuth progress for UI display (AC4)
 *
 * Provides human-readable progress information for the OAuth flow.
 */
export interface OAuthProgress {
  /** Current state */
  state: OAuthState;
  /** Human-readable step description */
  step_description: string;
  /** Current step number (1-4) */
  current_step: number;
  /** Total steps */
  total_steps: number;
  /** When this step started (Unix timestamp milliseconds) */
  started_at: number;
  /** When this step times out (Unix timestamp milliseconds, if applicable) */
  timeout_at: number | null;
  /** Whether user can cancel */
  cancellable: boolean;
}

/**
 * OAuth error types (AC6)
 *
 * Uses tagged union pattern to match Rust serde serialization.
 */
export type OAuthError =
  | { type: "DeepLinkTimeout" }
  | { type: "LocalServerTimeout" }
  | { type: "InvalidState" }
  | { type: "InvalidCode" }
  | { type: "NetworkError"; message: string }
  | { type: "ProviderError"; code: string; description: string }
  | { type: "Cancelled" }
  | { type: "InternalError"; message: string };

/**
 * OAuth provider configuration
 *
 * Used for specifying which provider to authenticate with.
 */
export type OAuthProvider = "google" | "github" | "default";

/**
 * Get user-friendly error message (AC6)
 *
 * Converts OAuth error types to human-readable messages.
 */
export function getOAuthErrorMessage(error: OAuthError): string {
  switch (error.type) {
    case "DeepLinkTimeout":
      return "The sign-in callback timed out. Trying an alternative method...";
    case "LocalServerTimeout":
      return "The local sign-in server timed out. Please try manual code entry.";
    case "InvalidState":
      return "Security check failed. Please try signing in again.";
    case "InvalidCode":
      return "The authorization code was invalid. Please try again.";
    case "NetworkError":
      return `Network error: ${error.message}`;
    case "ProviderError":
      return error.description || `Sign-in error: ${error.code}`;
    case "Cancelled":
      return "Sign-in was cancelled.";
    case "InternalError":
      return `An error occurred: ${error.message}`;
    default: {
      const _exhaustive: never = error;
      return `Unknown error: ${JSON.stringify(_exhaustive)}`;
    }
  }
}

/**
 * Check if error is retriable (AC6)
 *
 * Some errors can be resolved by trying again.
 */
export function isRetriableError(error: OAuthError): boolean {
  switch (error.type) {
    case "DeepLinkTimeout":
    case "LocalServerTimeout":
    case "NetworkError":
      return true;
    case "InvalidState":
    case "InvalidCode":
    case "ProviderError":
    case "Cancelled":
    case "InternalError":
      return false;
    default: {
      const _exhaustive: never = error;
      return !!_exhaustive;
    }
  }
}

/**
 * Check if error should trigger fallback (AC2, AC3)
 *
 * Timeout errors should automatically fall back to the next method.
 */
export function isTimeoutError(error: OAuthError): boolean {
  return (
    error.type === "DeepLinkTimeout" || error.type === "LocalServerTimeout"
  );
}

/**
 * Check if OAuth state indicates loading/in-progress
 */
export function isOAuthLoading(state: OAuthState): boolean {
  return (
    state.type === "AwaitingDeepLink" ||
    state.type === "AwaitingLocalServer" ||
    state.type === "AwaitingManualEntry" ||
    state.type === "ExchangingTokens"
  );
}

/**
 * Check if OAuth state indicates completion
 */
export function isOAuthComplete(state: OAuthState): boolean {
  return state.type === "Complete";
}

/**
 * Check if OAuth state indicates failure
 */
export function isOAuthFailed(state: OAuthState): boolean {
  return state.type === "Failed";
}

/**
 * Check if OAuth state is idle (ready to start)
 */
export function isOAuthIdle(state: OAuthState): boolean {
  return state.type === "Idle";
}

/**
 * Get step label for progress display (AC4)
 */
export function getStepLabel(step: number): string {
  switch (step) {
    case 1:
      return "Waiting for callback";
    case 2:
      return "Using local server";
    case 3:
      return "Manual code entry";
    case 4:
      return "Completing sign-in";
    default:
      return "Ready";
  }
}

/**
 * Default OAuth progress when idle
 */
export const DEFAULT_OAUTH_PROGRESS: OAuthProgress = {
  state: { type: "Idle" },
  step_description: "Ready to sign in",
  current_step: 0,
  total_steps: 4,
  started_at: 0,
  timeout_at: null,
  cancellable: true,
};
