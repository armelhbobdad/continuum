/**
 * Persistence Configuration for Session Store
 *
 * Custom storage adapter with performance monitoring per NFR-STATE-3.
 * Zustand persist middleware configuration with version migration support.
 *
 * PERSISTENCE BOUNDARY (ADR-PERSIST-003):
 * - Sessions: Persisted to localStorage via Zustand persist middleware
 * - Privacy mode: NEVER persisted (resets each session for explicit user choice)
 * - Network log: NEVER persisted (sensitive metadata per ADR-PRIVACY-004)
 * - Jazz sync: Deferred to Epic 6 (not in scope for Story 1.7)
 *
 * Story 1.7: Session Persistence & Auto-Save
 * ADR-PERSIST-001: Zustand Persist Middleware for Sessions
 */
import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { SessionState } from "./session";

/**
 * Storage key for session data in localStorage.
 * Per ADR-PERSIST-001: Sessions persist locally, separate from privacy store.
 */
export const STORAGE_KEY = "continuum-sessions";

/**
 * Current storage schema version for migration support.
 * Increment when SessionState schema changes.
 */
export const STORAGE_VERSION = 1;

/**
 * Performance budget in milliseconds per NFR-STATE-3.
 * Logs warnings if persistence exceeds this threshold.
 */
const PERSISTENCE_BUDGET_MS = 50;

/**
 * ISO 8601 date string pattern for JSON reviver.
 * Matches strings like "2024-12-28T12:00:00.000Z"
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

/**
 * JSON reviver that converts ISO date strings back to Date objects.
 * Used during deserialization to restore proper Date types.
 */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    return new Date(value);
  }
  return value;
}

/**
 * Custom storage adapter with performance monitoring and date handling.
 *
 * Implements PersistStorage directly (not using createJSONStorage) to enable
 * custom date deserialization via JSON reviver. This ensures Date objects
 * are properly restored when loading from localStorage.
 *
 * Logs warnings if persistence exceeds 50ms budget (NFR-STATE-3).
 *
 * @returns PersistStorage implementation for Zustand persist middleware
 */
export function createStorageAdapter(): PersistStorage<PartialSessionState> {
  return {
    getItem: (name: string): StorageValue<PartialSessionState> | null => {
      const start = performance.now();
      const value = localStorage.getItem(name);
      const duration = performance.now() - start;

      if (duration > PERSISTENCE_BUDGET_MS) {
        console.warn(
          `[persist] Read exceeded budget: ${duration.toFixed(1)}ms (limit: ${PERSISTENCE_BUDGET_MS}ms)`
        );
      }

      if (value === null) {
        return null;
      }

      // Use dateReviver to restore Date objects from ISO strings
      return JSON.parse(
        value,
        dateReviver
      ) as StorageValue<PartialSessionState>;
    },

    setItem: (name: string, value: StorageValue<PartialSessionState>): void => {
      const start = performance.now();
      localStorage.setItem(name, JSON.stringify(value));
      const duration = performance.now() - start;

      if (duration > PERSISTENCE_BUDGET_MS) {
        console.warn(
          `[persist] Write exceeded budget: ${duration.toFixed(1)}ms (limit: ${PERSISTENCE_BUDGET_MS}ms)`
        );
      }
    },

    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}

/**
 * Partialize function to select which state properties to persist.
 *
 * Only persists session data, not UI state (isDirty, lastSavedAt, wasRecovered).
 * Per ADR-PERSIST-001: Store session data for crash recovery.
 *
 * @param state - Full session store state
 * @returns Partial state containing only persistable properties
 */
export function partializeSessionState(
  state: SessionState
): PartialSessionState {
  return {
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
  };
}

/**
 * Partial session state that gets persisted.
 * Excludes transient UI state like isDirty, lastSavedAt, wasRecovered.
 */
export interface PartialSessionState {
  sessions: SessionState["sessions"];
  activeSessionId: SessionState["activeSessionId"];
}

/**
 * Migration function for handling schema changes between versions.
 *
 * @param persistedState - State loaded from storage
 * @param version - Version number from storage
 * @returns Migrated state compatible with current schema
 */
export function migrateSessionState(
  persistedState: unknown,
  version: number
): StorageValue<PartialSessionState> {
  // Handle migration from version 0 to 1 (no-op for initial version)
  if (version === 0) {
    // Future migrations can transform data here
    // For now, version 0 -> 1 is identity migration
  }

  return persistedState as StorageValue<PartialSessionState>;
}

// Note: Date deserialization is now handled by dateReviver in createStorageAdapter().
// The previous onRehydrateStorage approach mutated state without triggering re-renders.
