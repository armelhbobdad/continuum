/**
 * Types barrel export (Story 5.1, 5.5)
 *
 * Central export point for shared TypeScript types.
 */

// Connectivity transition types (Story 4.4)
export type {
  PartialResponseState,
  TransitionState,
} from "./connectivity-transition";
// Credential types (Story 5.1, 5.2, 5.4)
export type {
  AuthState,
  CredentialError,
  CredentialErrorType,
  CredentialStatus,
  DegradedMode,
  OfflineValidationResult,
  OpaqueToken,
  RefreshResult,
  SecurityLevel,
  StorageInfo,
  StorageTier,
  TokenType,
  UserInfo,
} from "./credentials";
export {
  canWriteInMode,
  DEFAULT_AUTH_STATE,
  DEFAULT_OFFLINE_VALIDATION,
  DEFAULT_STORAGE_INFO,
  getModeDescription,
  isExpiredError,
  isExpiringSoon,
  isMemoryOnlyMode,
  isNotFoundError,
  needsReauth,
  storageTierPersists,
} from "./credentials";
// Inference types (Story 1.5)
export type {
  InferenceBadgeState,
  InferenceMetadata,
  InferenceSource,
  StreamingMetadata,
} from "./inference";
// Migration types (Story 5.5)
export type {
  MigrationChoice,
  MigrationProgress,
  MigrationResult,
  MigrationState,
  MigrationStatus,
} from "./migration";
export {
  DEFAULT_MIGRATION_STATE,
  getMigrationProgressPercentage,
  isMigrationComplete,
  isMigrationFailed,
  isMigrationIdle,
  isMigrationInProgress,
} from "./migration";
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
// Session types (Story 5.5)
export type {
  Message,
  MessageMetadata,
  Session,
  SummarizationMetadata,
} from "./session";
export {
  generateAnonymousId,
  isAnonymousSession,
  isMigratedSession,
  isOwnedByUser,
} from "./session";
// Sync queue types (Story 4.5)
export type {
  SyncOperation,
  SyncQueueEntry,
  SyncQueueState,
  SyncStatus,
} from "./sync-queue";
