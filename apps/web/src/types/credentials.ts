/**
 * Credential Bridge Types (Story 5.1, 5.2)
 *
 * Type definitions for secure credential management.
 * These types mirror the Rust backend types but contain NO secrets.
 *
 * SECURITY: This file NEVER contains raw credential types.
 * All sensitive data remains in Rust backend.
 *
 * Story 5.1: Credential Bridge Foundation
 * - AC2: Opaque tokens via IPC
 * - AC3: No credentials in web storage
 *
 * Story 5.2: OS Keychain Integration
 * - AC6: Storage tier indicator
 */

/**
 * Credential status from Rust backend (AC1, AC2)
 *
 * Indicates the current state of stored credentials.
 */
export type CredentialStatus = "NotStored" | "Valid" | "Expired" | "Invalid";

/**
 * Token type for opaque tokens (AC2)
 */
export type TokenType = "Session" | "Csrf";

/**
 * User info safe for frontend (AC2)
 *
 * Contains only non-sensitive user information.
 * No passwords, tokens, or secrets.
 */
export interface UserInfo {
  /** User's unique ID */
  id: string;
  /** User's email (if available) */
  email: string | null;
  /** Display name */
  display_name: string | null;
  /** Profile picture URL (if available) */
  picture: string | null;
}

/**
 * Authentication state (opaque, no secrets) (AC1, AC2)
 *
 * SECURITY: This type NEVER contains raw credentials.
 * All sensitive data remains in Rust.
 */
export interface AuthState {
  /** Current credential status */
  status: CredentialStatus;
  /** Opaque session identifier (NOT the actual token) */
  session_id: string | null;
  /** When the session expires (Unix timestamp in seconds) */
  expiry_timestamp: number | null;
  /** Basic user info (no secrets) */
  user_info: UserInfo | null;
}

/**
 * Opaque token for frontend use (AC2)
 *
 * SECURITY: This is NOT the actual credential value.
 * It's an opaque reference managed by Rust.
 */
export interface OpaqueToken {
  /** Token identifier (NOT the actual value) */
  id: string;
  /** When this token expires (Unix timestamp in seconds) */
  expiry: number;
  /** Token type (session, csrf, etc.) */
  token_type: TokenType;
}

/**
 * Credential error types from Rust backend
 */
export type CredentialErrorType =
  | "NotFound"
  | "Expired"
  | "Invalid"
  | "StorageError"
  | "InternalError";

/**
 * Credential error from Rust backend
 */
export interface CredentialError {
  /** Error type */
  type: CredentialErrorType;
  /** Error message (for StorageError and InternalError) */
  message?: string;
}

/**
 * Helper to check if an error is a credential not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes("NotFound") || message.includes("No credentials");
}

/**
 * Helper to check if an error is a credential expired error
 */
export function isExpiredError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes("Expired") || message.includes("expired");
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Default auth state when no credentials are stored
 */
export const DEFAULT_AUTH_STATE: AuthState = {
  status: "NotStored",
  session_id: null,
  expiry_timestamp: null,
  user_info: null,
};

// =============================================================================
// Story 5.2: OS Keychain Integration - Storage Tier Types
// =============================================================================

/**
 * Storage tier for credentials (AC6)
 *
 * Represents the current storage backend being used for credentials.
 * - Keychain: OS-managed keychain (highest security)
 * - Stronghold: Encrypted vault storage (good security)
 * - MemoryOnly: Session-only storage (fallback, no persistence)
 */
export type StorageTier = "Keychain" | "Stronghold" | "MemoryOnly";

/**
 * Security level for display purposes (AC6)
 */
export type SecurityLevel = "Highest" | "Good" | "Limited";

/**
 * Storage info for UI display (AC6)
 *
 * Contains all information needed to display the current storage
 * tier status in the settings UI.
 */
export interface StorageInfo {
  /** Current storage tier */
  tier: StorageTier;
  /** Human-readable name for display */
  display_name: string;
  /** Security level indicator */
  security_level: SecurityLevel;
  /** Detailed description for tooltip/help text */
  description: string;
  /** Whether credentials persist across app restarts */
  persists_on_restart: boolean;
}

/**
 * Default storage info when loading or unknown
 */
export const DEFAULT_STORAGE_INFO: StorageInfo = {
  tier: "MemoryOnly",
  display_name: "Loading...",
  security_level: "Limited",
  description: "Checking available storage backends...",
  persists_on_restart: false,
};

/**
 * Helper to check if storage tier provides persistence
 */
export function storageTierPersists(tier: StorageTier): boolean {
  return tier === "Keychain" || tier === "Stronghold";
}

/**
 * Helper to check if storage is in memory-only fallback mode
 */
export function isMemoryOnlyMode(tier: StorageTier): boolean {
  return tier === "MemoryOnly";
}

// =============================================================================
// Story 5.4: Offline Authentication - Types
// =============================================================================

/**
 * Degraded mode levels for offline access (AC3)
 *
 * - FullAccess: Within 30-day offline window
 * - ReadOnly: 30-37 days offline (grace period)
 * - RequiresReauth: > 37 days offline, must re-authenticate
 */
export type DegradedMode = "FullAccess" | "ReadOnly" | "RequiresReauth";

/**
 * Offline validation result from Rust backend (AC1, AC4)
 *
 * Contains all information about offline credential validity.
 */
export interface OfflineValidationResult {
  /** Whether credentials are valid for offline use */
  is_valid: boolean;
  /** When offline validity expires (Unix timestamp) */
  expires_at: number;
  /** Current degraded mode level */
  mode: DegradedMode;
  /** Days remaining in offline window */
  days_remaining: number;
  /** Whether credentials need refresh when online */
  needs_refresh: boolean;
}

/**
 * Refresh result from credential refresh attempt (AC5, AC6, AC7)
 */
export interface RefreshResult {
  /** Whether refresh was successful */
  success: boolean;
  /** Error message if refresh failed */
  error: string | null;
  /** Whether re-authentication is required */
  requires_reauth: boolean;
  /** Time until next retry in milliseconds (if applicable) */
  retry_after_ms: number | null;
}

/**
 * Default offline validation result when not authenticated
 */
export const DEFAULT_OFFLINE_VALIDATION: OfflineValidationResult = {
  is_valid: false,
  expires_at: 0,
  mode: "RequiresReauth",
  days_remaining: 0,
  needs_refresh: true,
};

/**
 * Helper to check if degraded mode allows write operations
 */
export function canWriteInMode(mode: DegradedMode): boolean {
  return mode === "FullAccess";
}

/**
 * Helper to check if degraded mode requires re-authentication
 */
export function needsReauth(mode: DegradedMode): boolean {
  return mode === "RequiresReauth";
}

/**
 * Helper to check if credentials are expiring soon (within 3 days)
 */
export function isExpiringSoon(result: OfflineValidationResult): boolean {
  return result.days_remaining <= 3 && result.days_remaining > 0;
}

/**
 * Helper to get human-readable mode description
 */
export function getModeDescription(mode: DegradedMode): string {
  switch (mode) {
    case "FullAccess":
      return "Full access - all features available offline";
    case "ReadOnly":
      return "Read-only mode - sync when online to continue editing";
    case "RequiresReauth":
      return "Authentication required - please sign in";
    default:
      return "Unknown authentication mode";
  }
}
