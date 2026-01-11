/**
 * Sync Queue Types
 *
 * Type definitions for the sync queue system that tracks operations
 * performed while offline for optimistic sync feedback.
 *
 * NOTE: Real sync handled by Jazz CRDT in Epic 6. This queue is for
 * optimistic UI feedback only.
 *
 * Story 4.5: AC2, AC3
 */

/** Operation types that can be queued for sync */
export type SyncOperation =
  | "session-create"
  | "session-update"
  | "message-add"
  | "session-delete";

/** Sync status for queue entries */
export type SyncStatus = "pending" | "syncing" | "completed" | "failed";

/**
 * A single entry in the sync queue
 */
export interface SyncQueueEntry {
  /** Unique entry ID */
  id: string;
  /** Operation type */
  operation: SyncOperation;
  /** When the operation was queued */
  timestamp: Date;
  /** Operation payload (session ID, message data, etc.) */
  payload: {
    sessionId?: string;
    messageId?: string;
    data?: unknown;
  };
  /** Current sync status */
  status: SyncStatus;
  /** Error message if failed */
  error?: string;
  /** Retry count */
  retryCount: number;
}

/**
 * Sync Queue Store State Interface
 */
export interface SyncQueueState {
  /** Queue entries */
  entries: SyncQueueEntry[];
  /** Add a new operation to the queue, returns entry ID */
  addToQueue: (
    operation: SyncOperation,
    payload: SyncQueueEntry["payload"]
  ) => string;
  /** Remove an entry from the queue */
  removeFromQueue: (entryId: string) => void;
  /** Get all pending (not yet synced) operations */
  getQueuedOperations: () => SyncQueueEntry[];
  /** Mark an entry as currently syncing */
  markSyncing: (entryId: string) => void;
  /** Mark an entry as successfully completed */
  markCompleted: (entryId: string) => void;
  /** Mark an entry as failed with error message */
  markFailed: (entryId: string, error: string) => void;
  /** Clear all completed entries from queue */
  clearCompleted: () => void;
}
