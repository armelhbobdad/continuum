"use client";

import { create } from "zustand";
import type {
  SyncOperation,
  SyncQueueEntry,
  SyncQueueState,
} from "@/types/sync-queue";

/**
 * Sync Queue Store - MEMORY ONLY (never persisted)
 *
 * Tracks operations performed while offline for optimistic sync feedback.
 * Real sync handled by Jazz CRDT in Epic 6.
 *
 * Story 4.5: AC2, AC3
 */
export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  entries: [],

  addToQueue: (
    operation: SyncOperation,
    payload: SyncQueueEntry["payload"]
  ) => {
    const id = crypto.randomUUID();
    const entry: SyncQueueEntry = {
      id,
      operation,
      timestamp: new Date(),
      payload,
      status: "pending",
      retryCount: 0,
    };

    set((state) => ({
      entries: [...state.entries, entry],
    }));

    return id;
  },

  removeFromQueue: (entryId: string) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== entryId),
    }));
  },

  getQueuedOperations: () => {
    return get().entries.filter((e) => e.status === "pending");
  },

  markSyncing: (entryId: string) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, status: "syncing" as const } : e
      ),
    }));
  },

  markCompleted: (entryId: string) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, status: "completed" as const } : e
      ),
    }));
  },

  markFailed: (entryId: string, error: string) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              status: "failed" as const,
              error,
              retryCount: e.retryCount + 1,
            }
          : e
      ),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      entries: state.entries.filter((e) => e.status !== "completed"),
    }));
  },
}));
