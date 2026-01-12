/**
 * Types barrel export (Story 5.1)
 *
 * Central export point for shared TypeScript types.
 */

// Connectivity transition types (Story 4.4)
export type {
  PartialResponseState,
  TransitionState,
} from "./connectivity-transition";
// Credential types (Story 5.1)
export type {
  AuthState,
  CredentialError,
  CredentialErrorType,
  CredentialStatus,
  OpaqueToken,
  TokenType,
  UserInfo,
} from "./credentials";
export {
  DEFAULT_AUTH_STATE,
  isExpiredError,
  isNotFoundError,
} from "./credentials";
// Inference types (Story 1.5)
export type {
  InferenceBadgeState,
  InferenceMetadata,
  InferenceSource,
  StreamingMetadata,
} from "./inference";
// OAuth types (Story 5.3)
export type {
  OAuthError,
  OAuthProgress,
  OAuthProvider,
  OAuthState,
} from "./oauth";
export {
  DEFAULT_OAUTH_PROGRESS,
  getOAuthErrorMessage,
  getStepLabel,
  isOAuthComplete,
  isOAuthFailed,
  isOAuthIdle,
  isOAuthLoading,
  isRetriableError,
  isTimeoutError,
} from "./oauth";
// Preflight types (Story 4.3)
export type {
  CheckAction,
  CheckCategory,
  CheckStatus,
  PreFlightCheck,
  PreFlightResult,
} from "./preflight";
// Sync queue types (Story 4.5)
export type {
  SyncOperation,
  SyncQueueEntry,
  SyncQueueState,
  SyncStatus,
} from "./sync-queue";
