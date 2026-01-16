/**
 * Session Types (Story 5.5)
 *
 * Type definitions for chat sessions with owner and migration support.
 * Extended from Story 1.3 to support anonymous-to-authenticated migration.
 *
 * Story 5.5: Anonymous to Authenticated Migration
 * AC1: Anonymous User Account Creation
 * AC3: Atomic Data Migration
 */
import type { InferenceMetadata } from "@/types/inference";

/**
 * Metadata for summarized messages (Story 3.5 Task 1.1, 1.2)
 * Tracks original messages that were condensed into a summary.
 */
export interface SummarizationMetadata {
  /** This message is a summary */
  isSummary: true;
  /** IDs of original messages that were summarized */
  originalMessageIds: string[];
  /** When summarization occurred */
  summarizedAt: Date;
  /** Number of messages summarized */
  messageCount: number;
  /** Token count before summarization */
  originalTokenCount: number;
  /** Token count after summarization */
  summarizedTokenCount: number;
}

/** Metadata for finalized messages (Story 1.4 Task 8.3, extended in 1.5, 2.4, 3.5) */
export interface MessageMetadata {
  tokensGenerated?: number;
  finishReason?: "completed" | "aborted" | "error";
  durationMs?: number;
  /** Inference metadata (Story 1.5) */
  inference?: InferenceMetadata;
  /** Model ID that generated this message (Story 2.4 Task 8.1) */
  modelId?: string;
  /** Summarization metadata (Story 3.5 Task 1.1) */
  summarization?: SummarizationMetadata;
}

/**
 * Message in a chat session.
 * Role: 'user' for human messages, 'assistant' for AI responses.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Metadata populated after generation completes (assistant messages only) */
  metadata?: MessageMetadata;
}

/**
 * Chat session containing messages.
 * Title is generated from first message (max 50 chars).
 *
 * Story 5.5 additions:
 * - ownerId: Owner's user ID, null/undefined for anonymous sessions
 * - anonymousId: Device-based ID for tracking pre-migration sessions
 * - migratedAt: Timestamp when session was migrated to authenticated account
 */
export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  /**
   * Owner's user ID. null/undefined for anonymous sessions.
   * Set to user.id after successful migration (AC3).
   */
  ownerId?: string | null;
  /**
   * Anonymous device ID before migration.
   * Preserved for audit trail after migration.
   */
  anonymousId?: string;
  /**
   * When session was migrated from anonymous to authenticated.
   * Presence indicates this session was migrated.
   */
  migratedAt?: Date;
}

/**
 * Storage key for anonymous device ID.
 * Uses localStorage for persistence across sessions.
 */
const ANONYMOUS_ID_KEY = "continuum-anonymous-id";

/**
 * Generate or retrieve a stable device-based anonymous ID.
 * Same device will always get the same ID within the same browser.
 *
 * @returns Stable anonymous device ID
 */
export function generateAnonymousId(): string {
  // Check if we already have a stored ID
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) {
      return stored;
    }
  }

  // Generate a new ID based on device characteristics
  // Using crypto.randomUUID for uniqueness, stored for stability
  const newId = `anon-${crypto.randomUUID()}`;

  // Persist the ID
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ANONYMOUS_ID_KEY, newId);
  }

  return newId;
}

/**
 * Check if a session is anonymous (no owner).
 * Anonymous sessions have ownerId === null or undefined (AC1).
 *
 * @param session - Session to check
 * @returns true if session is anonymous
 */
export function isAnonymousSession(session: Session): boolean {
  return session.ownerId === null || session.ownerId === undefined;
}

/**
 * Check if a session is owned by a specific user.
 *
 * @param session - Session to check
 * @param userId - User ID to match
 * @returns true if session is owned by the specified user
 */
export function isOwnedByUser(session: Session, userId: string): boolean {
  return session.ownerId === userId;
}

/**
 * Check if a session has been migrated from anonymous to authenticated.
 * Migrated sessions have a migratedAt timestamp (AC3).
 *
 * @param session - Session to check
 * @returns true if session was migrated
 */
export function isMigratedSession(session: Session): boolean {
  return session.migratedAt !== undefined && session.migratedAt !== null;
}
