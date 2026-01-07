import { beforeEach, describe, expect, it } from "vitest";
import { useSyncQueueStore } from "../sync-queue";

/**
 * Sync Queue Store Tests
 *
 * Story 4.5: AC2, AC3
 * Memory-only store for tracking offline operations.
 */
describe("useSyncQueueStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useSyncQueueStore.setState({ entries: [] });
  });

  describe("addToQueue", () => {
    it("adds entry to queue with pending status", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-create", {
        sessionId: "test-session",
      });

      expect(id).toBeDefined();
      expect(useSyncQueueStore.getState().entries).toHaveLength(1);
      expect(useSyncQueueStore.getState().entries[0].status).toBe("pending");
    });

    it("generates unique IDs for each entry", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      const id2 = useSyncQueueStore.getState().addToQueue("session-update", {});

      expect(id1).not.toBe(id2);
      expect(useSyncQueueStore.getState().entries).toHaveLength(2);
    });

    it("sets timestamp on new entries", () => {
      const before = new Date();
      useSyncQueueStore.getState().addToQueue("message-add", {
        messageId: "msg-1",
      });
      const after = new Date();

      const entry = useSyncQueueStore.getState().entries[0];
      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("initializes retryCount to 0", () => {
      useSyncQueueStore.getState().addToQueue("session-delete", {
        sessionId: "test",
      });

      expect(useSyncQueueStore.getState().entries[0].retryCount).toBe(0);
    });
  });

  describe("removeFromQueue", () => {
    it("removes entry by ID", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-create", {});
      expect(useSyncQueueStore.getState().entries).toHaveLength(1);

      useSyncQueueStore.getState().removeFromQueue(id);
      expect(useSyncQueueStore.getState().entries).toHaveLength(0);
    });

    it("does not affect other entries", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      const id2 = useSyncQueueStore.getState().addToQueue("session-update", {});

      useSyncQueueStore.getState().removeFromQueue(id1);

      expect(useSyncQueueStore.getState().entries).toHaveLength(1);
      expect(useSyncQueueStore.getState().entries[0].id).toBe(id2);
    });
  });

  describe("getQueuedOperations", () => {
    it("returns only pending operations", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      useSyncQueueStore.getState().addToQueue("session-update", {});

      useSyncQueueStore.getState().markCompleted(id1);

      const pending = useSyncQueueStore.getState().getQueuedOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe("pending");
    });

    it("excludes syncing entries", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      useSyncQueueStore.getState().addToQueue("session-update", {});

      useSyncQueueStore.getState().markSyncing(id1);

      const pending = useSyncQueueStore.getState().getQueuedOperations();
      expect(pending).toHaveLength(1);
    });
  });

  describe("markSyncing", () => {
    it("marks entry as syncing", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-update", {
        sessionId: "test",
      });

      useSyncQueueStore.getState().markSyncing(id);

      expect(useSyncQueueStore.getState().entries[0].status).toBe("syncing");
    });
  });

  describe("markCompleted", () => {
    it("marks entry as completed", () => {
      const id = useSyncQueueStore.getState().addToQueue("message-add", {
        messageId: "msg-1",
      });

      useSyncQueueStore.getState().markCompleted(id);

      expect(useSyncQueueStore.getState().entries[0].status).toBe("completed");
    });
  });

  describe("markFailed", () => {
    it("marks entry as failed with error", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-create", {});

      useSyncQueueStore.getState().markFailed(id, "Network error");

      const entry = useSyncQueueStore.getState().entries[0];
      expect(entry.status).toBe("failed");
      expect(entry.error).toBe("Network error");
    });

    it("increments retryCount on failure", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-create", {});

      useSyncQueueStore.getState().markFailed(id, "Error 1");
      expect(useSyncQueueStore.getState().entries[0].retryCount).toBe(1);

      useSyncQueueStore.getState().markFailed(id, "Error 2");
      expect(useSyncQueueStore.getState().entries[0].retryCount).toBe(2);
    });
  });

  describe("clearCompleted", () => {
    it("clears completed entries", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      useSyncQueueStore.getState().addToQueue("session-update", {});

      useSyncQueueStore.getState().markCompleted(id1);
      useSyncQueueStore.getState().clearCompleted();

      expect(useSyncQueueStore.getState().entries).toHaveLength(1);
      expect(useSyncQueueStore.getState().entries[0].status).toBe("pending");
    });

    it("preserves pending and failed entries", () => {
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      const id2 = useSyncQueueStore.getState().addToQueue("session-update", {});
      useSyncQueueStore.getState().addToQueue("message-add", {});

      useSyncQueueStore.getState().markCompleted(id1);
      useSyncQueueStore.getState().markFailed(id2, "Failed");

      useSyncQueueStore.getState().clearCompleted();

      expect(useSyncQueueStore.getState().entries).toHaveLength(2);
    });
  });

  describe("memory-only store", () => {
    it("is memory-only (no persist wrapper)", () => {
      // Verify the store is not wrapped with persist middleware
      const store = useSyncQueueStore;
      expect(
        (store as unknown as { persist?: unknown }).persist
      ).toBeUndefined();
    });
  });
});
