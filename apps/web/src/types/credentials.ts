/**
 * Credential Bridge Types (Story 5.1)
 *
 * Type definitions for secure credential management.
 * These types mirror the Rust backend types but contain NO secrets.
 *
 * SECURITY: This file NEVER contains raw credential types.
 * All sensitive data remains in Rust backend.
 *
 * AC2: Opaque tokens via IPC
 * AC3: No credentials in web storage
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
